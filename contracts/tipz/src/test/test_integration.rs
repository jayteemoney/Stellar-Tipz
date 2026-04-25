//! End-to-end integration tests (issue #474).
//!
//! Exercises the complete creator lifecycle as it would unfold in production:
//!
//!   register_profile → send_tip → calculate_credit_score → leaderboard
//!     → withdraw_tips → balance assertions
//!
//! Tests in this file go through the *public* contract entrypoints and the
//! Stellar Asset Contract (SAC) for native XLM.  They intentionally avoid
//! reaching into storage directly so a regression in any single layer is
//! caught even if the rest of the chain still produces plausible results.

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, token, Address, Env, String};

use crate::storage::{self, DataKey};
use crate::types::{Profile, Tip};
use crate::TipzContract;
use crate::TipzContractClient;

// ── shared setup ──────────────────────────────────────────────────────────────

struct LifecycleCtx<'a> {
    env: Env,
    client: TipzContractClient<'a>,
    contract_id: Address,
    fee_collector: Address,
    sac: Address,
    token_admin_client: token::StellarAssetClient<'a>,
}

/// Initialise the contract with a 2 % withdrawal fee and a Stellar Asset
/// Contract for native XLM.  Returns the context shared by every test.
fn ctx(fee_bps: u32) -> LifecycleCtx<'static> {
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

    LifecycleCtx {
        env,
        client,
        contract_id,
        fee_collector,
        sac,
        token_admin_client,
    }
}

/// Register a creator through the *public* `register_profile` entrypoint
/// (not direct storage writes) so the registration path is exercised.
fn register_creator(c: &LifecycleCtx, username: &str) -> Address {
    let creator = Address::generate(&c.env);
    c.client.register_profile(
        &creator,
        &String::from_str(&c.env, username),
        &String::from_str(&c.env, "Display Name"),
        &String::from_str(&c.env, ""),
        &String::from_str(&c.env, ""),
        &String::from_str(&c.env, ""),
    );
    creator
}

/// Mint XLM to a fresh address and return it (a tipper with funds).
fn fund_tipper(c: &LifecycleCtx, balance_stroops: i128) -> Address {
    let tipper = Address::generate(&c.env);
    c.token_admin_client.mint(&tipper, &balance_stroops);
    tipper
}

// ── tests ─────────────────────────────────────────────────────────────────────

/// The headline scenario from the issue: a creator registers, receives a tip,
/// has their credit score recomputed, appears on the leaderboard, withdraws
/// their balance, and ends up with the expected XLM in their wallet.
#[test]
fn lifecycle_register_tip_score_leaderboard_withdraw() {
    let c = ctx(200); // 2 % fee
    let creator = register_creator(&c, "alice");
    let tipper = fund_tipper(&c, 100_000_000_000);

    let token_client = token::TokenClient::new(&c.env, &c.sac);

    // ── 1. baseline ────────────────────────────────────────────────────────
    let creator_xlm_before = token_client.balance(&creator);
    let collector_xlm_before = token_client.balance(&c.fee_collector);
    assert_eq!(creator_xlm_before, 0, "creator wallet starts empty");

    // ── 2. tip 50 XLM ──────────────────────────────────────────────────────
    let tip_amount: i128 = 500_000_000;
    c.client
        .send_tip(&tipper, &creator, &tip_amount, &String::from_str(&c.env, "great"));

    // Creator's profile balance updates.
    let profile = c.client.get_profile(&creator);
    assert_eq!(profile.balance, tip_amount);
    assert_eq!(profile.total_tips_received, tip_amount);
    assert_eq!(profile.total_tips_count, 1);

    // ── 3. credit score recomputed ────────────────────────────────────────
    // 50 XLM → tip_sub=50 → tip_pts=10 → score = BASE(40) + 10 = 50.
    let score = c.client.calculate_credit_score(&creator);
    assert_eq!(score, 50, "credit score must reflect tip volume");

    // ── 4. leaderboard contains the creator ────────────────────────────────
    let board = c.client.get_leaderboard(&10);
    assert_eq!(board.len(), 1, "single tipped creator → 1-entry leaderboard");
    assert_eq!(board.get(0).unwrap().address, creator);
    assert_eq!(board.get(0).unwrap().total_tips_received, tip_amount);

    let rank = c.client.get_leaderboard_rank(&creator);
    assert_eq!(rank, Some(1), "only creator → rank 1");

    // ── 5. withdraw the entire balance ─────────────────────────────────────
    c.client.withdraw_tips(&creator, &tip_amount);

    // 2 % fee = 10_000_000, net = 490_000_000.
    let expected_fee = tip_amount * 200 / 10_000;
    let expected_net = tip_amount - expected_fee;
    assert_eq!(token_client.balance(&creator), creator_xlm_before + expected_net);
    assert_eq!(
        token_client.balance(&c.fee_collector),
        collector_xlm_before + expected_fee
    );

    // ── 6. balance zeroed; credit score & lifetime totals preserved ───────
    let profile_after = c.client.get_profile(&creator);
    assert_eq!(profile_after.balance, 0, "balance zeroed after full withdraw");
    assert_eq!(
        profile_after.total_tips_received, tip_amount,
        "lifetime total preserved across withdraws"
    );
    assert_eq!(profile_after.credit_score, 50, "credit score preserved");

    // Re-querying the score after withdraw returns the same value — proves
    // that withdrawals do not depress the credit signal.
    assert_eq!(c.client.calculate_credit_score(&creator), 50);
}

/// A tip record is created in temporary storage and surfaces through the
/// `get_tip` and `get_recent_tips` query endpoints.  Verifies the tip
/// pipeline end-to-end.
#[test]
fn tip_records_are_queryable_after_send() {
    let c = ctx(200);
    let creator = register_creator(&c, "alice");
    let tipper = fund_tipper(&c, 1_000_000_000);

    c.client.send_tip(
        &tipper,
        &creator,
        &10_000_000,
        &String::from_str(&c.env, "first"),
    );
    c.client.send_tip(
        &tipper,
        &creator,
        &20_000_000,
        &String::from_str(&c.env, "second"),
    );

    let recent = c.client.get_recent_tips(&creator, &10);
    assert_eq!(recent.len(), 2, "both tips returned");

    // Direct lookup by ID still works.
    let tip0 = c.client.get_tip(&0);
    assert_eq!(tip0.tipper, tipper);
    assert_eq!(tip0.creator, creator);
    assert_eq!(tip0.amount, 10_000_000);

    // Sanity check raw storage matches the public query.
    c.env.as_contract(&c.contract_id, || {
        let tip: Tip = c
            .env
            .storage()
            .temporary()
            .get(&DataKey::Tip(0))
            .expect("tip stored");
        assert_eq!(tip.message, String::from_str(&c.env, "first"));
    });
}

/// Global stats reflect the full lifecycle: tip count and total volume
/// increase on every tip, fee total grows on every withdrawal.
#[test]
fn global_stats_track_full_lifecycle() {
    let c = ctx(200);
    let creator = register_creator(&c, "alice");
    let tipper = fund_tipper(&c, 10_000_000_000);

    let stats0 = c.client.get_stats();
    assert_eq!(stats0.total_tips_count, 0);
    assert_eq!(stats0.total_tips_volume, 0);
    assert_eq!(stats0.total_fees_collected, 0);
    assert_eq!(stats0.total_creators, 1, "register_creator added one");

    // Two tips totalling 30 XLM.
    c.client
        .send_tip(&tipper, &creator, &100_000_000, &String::from_str(&c.env, ""));
    c.client
        .send_tip(&tipper, &creator, &200_000_000, &String::from_str(&c.env, ""));

    let stats1 = c.client.get_stats();
    assert_eq!(stats1.total_tips_count, 2);
    assert_eq!(stats1.total_tips_volume, 300_000_000);
    assert_eq!(stats1.total_fees_collected, 0, "fees only on withdraw");

    // Withdraw 30 XLM (300_000_000 stroops) at 2 % → fee = 6_000_000 stroops.
    c.client.withdraw_tips(&creator, &300_000_000);
    let stats2 = c.client.get_stats();
    assert_eq!(stats2.total_fees_collected, 6_000_000);
}

/// After withdrawing, the credit score recomputed from the persisted profile
/// stays the same — the tipping signal is *cumulative* and not sensitive to
/// the wallet's current balance.
#[test]
fn credit_score_survives_full_withdraw() {
    let c = ctx(0); // zero fee → simpler assertions
    let creator = register_creator(&c, "alice");
    let tipper = fund_tipper(&c, 10_000_000_000);

    c.client.send_tip(
        &tipper,
        &creator,
        &500_000_000,
        &String::from_str(&c.env, ""),
    );
    let score_before = c.client.calculate_credit_score(&creator);

    c.client.withdraw_tips(&creator, &500_000_000);

    let score_after = c.client.calculate_credit_score(&creator);
    assert_eq!(score_after, score_before);
}

/// The leaderboard correctly mirrors the lifetime total, not the current
/// balance: a creator who has fully withdrawn must still appear with their
/// full historical volume.
#[test]
fn leaderboard_uses_lifetime_total_after_withdraw() {
    let c = ctx(200);
    let creator = register_creator(&c, "alice");
    let tipper = fund_tipper(&c, 10_000_000_000);

    c.client
        .send_tip(&tipper, &creator, &500_000_000, &String::from_str(&c.env, ""));
    c.client.withdraw_tips(&creator, &500_000_000);

    let board = c.client.get_leaderboard(&10);
    assert_eq!(board.len(), 1);
    assert_eq!(board.get(0).unwrap().total_tips_received, 500_000_000);
}

/// Insufficient balance during withdraw leaves the profile and global stats
/// untouched — failed withdrawals do not partially mutate state.
#[test]
fn failed_withdraw_does_not_mutate_state() {
    let c = ctx(200);
    let creator = register_creator(&c, "alice");
    let tipper = fund_tipper(&c, 10_000_000_000);

    c.client
        .send_tip(&tipper, &creator, &10_000_000, &String::from_str(&c.env, ""));
    let stats_before = c.client.get_stats();
    let profile_before = c.client.get_profile(&creator);

    // Try to withdraw 100 XLM when balance is 1 XLM.
    let result = c.client.try_withdraw_tips(&creator, &1_000_000_000);
    assert!(result.is_err());

    let stats_after = c.client.get_stats();
    let profile_after = c.client.get_profile(&creator);
    assert_eq!(stats_after.total_fees_collected, stats_before.total_fees_collected);
    assert_eq!(profile_after.balance, profile_before.balance);
}

/// Two registered creators can independently complete the full lifecycle
/// without their state interfering with each other (storage isolation).
#[test]
fn two_creators_lifecycles_are_independent() {
    let c = ctx(200);
    let alice = register_creator(&c, "alice");
    let bob = register_creator(&c, "bob");
    let tipper = fund_tipper(&c, 10_000_000_000);

    // Alice receives 30 XLM, Bob receives 70 XLM.
    c.client
        .send_tip(&tipper, &alice, &300_000_000, &String::from_str(&c.env, ""));
    c.client
        .send_tip(&tipper, &bob, &700_000_000, &String::from_str(&c.env, ""));

    // Alice withdraws everything; Bob does not.
    c.client.withdraw_tips(&alice, &300_000_000);

    let alice_p = c.client.get_profile(&alice);
    let bob_p = c.client.get_profile(&bob);

    assert_eq!(alice_p.balance, 0, "alice withdrew all");
    assert_eq!(bob_p.balance, 700_000_000, "bob's balance untouched");
    assert_eq!(alice_p.total_tips_received, 300_000_000);
    assert_eq!(bob_p.total_tips_received, 700_000_000);

    // Leaderboard reflects lifetime totals: Bob > Alice.
    let board = c.client.get_leaderboard(&10);
    assert_eq!(board.len(), 2);
    assert_eq!(board.get(0).unwrap().address, bob);
    assert_eq!(board.get(1).unwrap().address, alice);
}

/// Sanity check that `storage::has_profile` agrees with the public
/// `get_profile` entrypoint after a successful registration.
#[test]
fn registration_visible_through_storage_and_public_api() {
    let c = ctx(200);
    let alice = register_creator(&c, "alice");

    assert!(c.client.get_profile(&alice).owner == alice);

    c.env.as_contract(&c.contract_id, || {
        assert!(storage::has_profile(&c.env, &alice));
    });
}
