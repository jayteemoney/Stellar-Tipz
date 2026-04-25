//! Advanced multi-actor integration tests (issue #474).
//!
//! Stress scenarios that exercise the contract with many creators and tippers
//! at once.  These tests do not exercise pause/deregister flows because those
//! features are not implemented in the contract today — see issue #474 for
//! the broader test plan.
//!
//! Coverage:
//! - 5 creators × 10 tippers — verifies leaderboard ordering, per-profile
//!   balances, and aggregate stats remain consistent under load.
//! - Sequential tips from the same tipper to the same creator (the closest
//!   approximation of "concurrent operations" in a deterministic Soroban
//!   test environment, which executes transactions sequentially).
//! - Admin-driven fee changes mid-lifecycle apply to subsequent withdrawals.
//! - Fee collector address change splits collected fees correctly.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, token, Address, Env, String};

use crate::TipzContract;
use crate::TipzContractClient;

// ── shared setup ──────────────────────────────────────────────────────────────

struct Ctx<'a> {
    env: Env,
    client: TipzContractClient<'a>,
    admin: Address,
    fee_collector: Address,
    sac: Address,
    token_admin_client: token::StellarAssetClient<'a>,
}

fn ctx(fee_bps: u32) -> Ctx<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TipzContract);
    let client = TipzContractClient::new(&env, &contract_id);

    let token_admin = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin);
    let sac = token_contract.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &sac);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);
    client.initialize(&admin, &fee_collector, &fee_bps, &sac);

    Ctx {
        env,
        client,
        admin,
        fee_collector,
        sac,
        token_admin_client,
    }
}

fn register(c: &Ctx, username: &str) -> Address {
    let creator = Address::generate(&c.env);
    c.client.register_profile(
        &creator,
        &String::from_str(&c.env, username),
        &String::from_str(&c.env, "Display"),
        &String::from_str(&c.env, ""),
        &String::from_str(&c.env, ""),
        &String::from_str(&c.env, ""),
    );
    creator
}

fn fund(c: &Ctx, balance: i128) -> Address {
    let tipper = Address::generate(&c.env);
    c.token_admin_client.mint(&tipper, &balance);
    tipper
}

// ── tests ─────────────────────────────────────────────────────────────────────

/// Five creators receiving deterministic amounts from ten tippers each.
/// Verifies aggregate stats and leaderboard ordering after the cross-product
/// of tips has been sent.
#[test]
fn multi_creator_multi_tipper_consistency() {
    let c = ctx(0); // zero fee → cleaner balance math
    let usernames = ["alpha", "bravo", "delta", "echo", "foxtrot"];
    let mut creators = soroban_sdk::Vec::<Address>::new(&c.env);
    for u in usernames {
        creators.push_back(register(&c, u));
    }

    // Build 10 tippers each funded with 1 000 XLM.
    let mut tippers = soroban_sdk::Vec::<Address>::new(&c.env);
    for _ in 0..10u32 {
        tippers.push_back(fund(&c, 10_000_000_000));
    }

    // Each tipper sends `(creator_idx + 1) XLM` to each creator.
    // Per-creator total = 10 * (idx+1) XLM = (idx+1) * 100_000_000 stroops.
    let msg = String::from_str(&c.env, "");
    for ci in 0..creators.len() {
        let creator = creators.get(ci).unwrap();
        let amount: i128 = (ci as i128 + 1) * 10_000_000;
        for ti in 0..tippers.len() {
            let tipper = tippers.get(ti).unwrap();
            c.client.send_tip(&tipper, &creator, &amount, &msg);
        }
    }

    // Per-creator profile totals and counts match expectations.
    for ci in 0..creators.len() {
        let creator = creators.get(ci).unwrap();
        let p = c.client.get_profile(&creator);
        let expected_total: i128 = (ci as i128 + 1) * 10_000_000 * 10;
        assert_eq!(p.total_tips_received, expected_total, "creator {ci} total");
        assert_eq!(p.balance, expected_total, "creator {ci} balance");
        assert_eq!(p.total_tips_count, 10, "creator {ci} count");
    }

    // Global stats: 5 creators × 10 tippers = 50 tips.
    let stats = c.client.get_stats();
    assert_eq!(stats.total_tips_count, 50);
    assert_eq!(stats.total_creators, 5);

    // Sum of geometric-style totals: 1+2+3+4+5 = 15 → 15 * 10 XLM = 150 XLM.
    let expected_volume: i128 = (1 + 2 + 3 + 4 + 5) * 10 * 10_000_000;
    assert_eq!(stats.total_tips_volume, expected_volume);

    // Leaderboard descending by lifetime total → foxtrot first.
    let board = c.client.get_leaderboard(&10);
    assert_eq!(board.len(), 5);
    assert_eq!(board.get(0).unwrap().address, creators.get(4).unwrap());
    assert_eq!(board.get(4).unwrap().address, creators.get(0).unwrap());
}

/// Soroban tests are sequential by nature, but we can still exercise the
/// "many ops on the same profile back-to-back" code path.  Twenty tips from
/// the same tipper must aggregate exactly with no off-by-one in counts.
#[test]
fn many_sequential_tips_aggregate_exactly() {
    let c = ctx(0);
    let creator = register(&c, "alice");
    let tipper = fund(&c, 10_000_000_000);

    let amount: i128 = 1_000_000;
    for _ in 0..20u32 {
        c.client
            .send_tip(&tipper, &creator, &amount, &String::from_str(&c.env, ""));
    }

    let p = c.client.get_profile(&creator);
    assert_eq!(p.total_tips_count, 20);
    assert_eq!(p.total_tips_received, amount * 20);
    assert_eq!(p.balance, amount * 20);
}

/// Admin updates the withdrawal fee partway through the lifecycle.  Earlier
/// withdrawals use the old rate, later ones the new rate — total fees
/// collected reflect both.
#[test]
fn fee_change_mid_lifecycle_applies_to_later_withdraws() {
    let c = ctx(200); // start at 2 %
    let creator = register(&c, "alice");
    let tipper = fund(&c, 10_000_000_000);

    // Receive 1 XLM, withdraw at 2 %.
    c.client
        .send_tip(&tipper, &creator, &10_000_000, &String::from_str(&c.env, ""));
    c.client.withdraw_tips(&creator, &10_000_000);
    let stats1 = c.client.get_stats();
    assert_eq!(stats1.total_fees_collected, 200_000); // 2 % of 10_000_000

    // Admin bumps fee to 5 %.
    c.client.set_fee(&c.admin, &500);

    // Receive another 1 XLM, withdraw at 5 %.
    c.client
        .send_tip(&tipper, &creator, &10_000_000, &String::from_str(&c.env, ""));
    c.client.withdraw_tips(&creator, &10_000_000);

    let stats2 = c.client.get_stats();
    // 200_000 (2 %) + 500_000 (5 %) = 700_000.
    assert_eq!(stats2.total_fees_collected, 700_000);
}

/// Changing the fee collector address mid-flight: pre-change fees go to the
/// original collector, post-change fees to the new collector.  Funds already
/// paid out cannot move retroactively.
#[test]
fn fee_collector_change_splits_payouts() {
    let c = ctx(200);
    let creator = register(&c, "alice");
    let tipper = fund(&c, 10_000_000_000);
    let token_client = token::TokenClient::new(&c.env, &c.sac);

    // First cycle → fees to original collector.
    c.client
        .send_tip(&tipper, &creator, &50_000_000, &String::from_str(&c.env, ""));
    c.client.withdraw_tips(&creator, &50_000_000);
    let original_collector_balance = token_client.balance(&c.fee_collector);
    assert_eq!(original_collector_balance, 1_000_000); // 2 % of 50_000_000

    // Switch collector.
    let new_collector = Address::generate(&c.env);
    c.client.set_fee_collector(&c.admin, &new_collector);

    // Second cycle → fees to the new collector.
    c.client
        .send_tip(&tipper, &creator, &50_000_000, &String::from_str(&c.env, ""));
    c.client.withdraw_tips(&creator, &50_000_000);
    assert_eq!(token_client.balance(&new_collector), 1_000_000);
    // Original collector balance unchanged.
    assert_eq!(token_client.balance(&c.fee_collector), original_collector_balance);
}

/// A creator can interleave tips and partial withdrawals: lifetime total
/// tracks every tip, current balance only what hasn't been withdrawn yet.
#[test]
fn interleaved_tips_and_partial_withdraws() {
    let c = ctx(0); // zero fee for clean math
    let creator = register(&c, "alice");
    let tipper = fund(&c, 10_000_000_000);
    let msg = String::from_str(&c.env, "");

    c.client.send_tip(&tipper, &creator, &100_000_000, &msg); // bal=100
    c.client.withdraw_tips(&creator, &30_000_000); //                bal=70
    c.client.send_tip(&tipper, &creator, &50_000_000, &msg); //  bal=120
    c.client.withdraw_tips(&creator, &100_000_000); //               bal=20
    c.client.send_tip(&tipper, &creator, &10_000_000, &msg); //  bal=30

    let p = c.client.get_profile(&creator);
    assert_eq!(p.balance, 30_000_000, "running balance");
    assert_eq!(p.total_tips_received, 160_000_000, "lifetime total");
    assert_eq!(p.total_tips_count, 3);
}

/// `get_profile_by_username` must return the same data as `get_profile` by
/// address after registration — the username → address index is consistent
/// with the address → profile index.
#[test]
fn username_lookup_matches_address_lookup_after_registration() {
    let c = ctx(200);
    let alice = register(&c, "alice");

    let by_addr = c.client.get_profile(&alice);
    let by_username = c
        .client
        .get_profile_by_username(&String::from_str(&c.env, "alice"));

    assert_eq!(by_addr.owner, by_username.owner);
    assert_eq!(by_addr.username, by_username.username);
    assert_eq!(by_addr.registered_at, by_username.registered_at);
}

/// After many tips the leaderboard rank function still returns positions
/// that agree with the leaderboard listing order.
#[test]
fn leaderboard_rank_agrees_with_listing_order() {
    let c = ctx(0);
    let usernames = ["one", "two", "three"];
    let mut creators = soroban_sdk::Vec::<Address>::new(&c.env);
    for u in usernames {
        creators.push_back(register(&c, u));
    }
    let tipper = fund(&c, 10_000_000_000);
    let msg = String::from_str(&c.env, "");

    // Distinct totals so the order is deterministic.
    c.client
        .send_tip(&tipper, &creators.get(0).unwrap(), &100_000_000, &msg);
    c.client
        .send_tip(&tipper, &creators.get(1).unwrap(), &300_000_000, &msg);
    c.client
        .send_tip(&tipper, &creators.get(2).unwrap(), &200_000_000, &msg);

    let board = c.client.get_leaderboard(&10);
    for i in 0..board.len() {
        let entry = board.get(i).unwrap();
        let rank = c.client.get_leaderboard_rank(&entry.address);
        assert_eq!(rank, Some(i + 1), "rank for entry {i} agrees with listing");
    }
}
