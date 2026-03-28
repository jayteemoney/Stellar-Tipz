import React, { useState } from "react";
import {
  ArrowDownToLine,
  BarChart2,
  Coins,
  LayoutDashboard,
  QrCode,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import AmountDisplay from "../../components/shared/AmountDisplay";
import CreditBadge from "../../components/shared/CreditBadge";
import ShareLink from "../../components/shared/ShareLink";
import TipCard from "../../components/shared/TipCard";
import WalletConnect from "../../components/shared/WalletConnect";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import Skeleton from "../../components/ui/Skeleton";
import Tabs from "../../components/ui/Tabs";
import { useDashboard } from "../../hooks/useDashboard";
import { useWalletStore } from "../../store/walletStore";
import { stroopToXlm } from "../../helpers/format";
import BigNumber from "bignumber.js";

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------
interface OverviewTabProps {
  profile: NonNullable<ReturnType<typeof useDashboard>["profile"]>;
  stats: ReturnType<typeof useDashboard>["stats"];
  tips: ReturnType<typeof useDashboard>["tips"];
  loading: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ profile, stats, tips, loading }) => {
  const recentTips = tips.slice(0, 3);
  const hasActivity = profile.totalTipsCount > 0;

  return (
    <div className="space-y-6 pt-6">
      {/* Balance cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Available balance</p>
          {loading ? (
            <Skeleton variant="text" width="60%" />
          ) : (
            <AmountDisplay amount={profile.balance} className="text-2xl" />
          )}
        </Card>
        <Card className="space-y-2 bg-yellow-100">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Lifetime volume</p>
          {loading ? (
            <Skeleton variant="text" width="60%" />
          ) : (
            <AmountDisplay amount={profile.totalTipsReceived} className="text-2xl" />
          )}
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Supporters</p>
          {loading ? (
            <Skeleton variant="text" width="40%" />
          ) : (
            <p className="text-3xl font-black">{profile.totalTipsCount}</p>
          )}
        </Card>
        <Card className="space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Credit score</p>
          {loading ? (
            <Skeleton variant="text" width="50%" />
          ) : (
            <CreditBadge score={profile.creditScore} />
          )}
        </Card>
      </section>

      {/* Quick actions */}
      <section>
        <Card className="space-y-3" padding="lg">
          <h2 className="text-xl font-black uppercase">Quick actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/profile">
              <Button variant="outline" size="sm" icon={<Wallet size={14} />}>
                View profile
              </Button>
            </Link>
            <Link to={`/@${profile.username}`}>
              <Button variant="outline" size="sm" icon={<TrendingUp size={14} />}>
                My tip page
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Activity mini */}
      <section>
        <Card className="space-y-4" padding="lg">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black uppercase">Recent activity</h2>
            <Link to="/profile" className="text-sm font-black uppercase underline">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rect" height="4rem" />
              ))}
            </div>
          ) : !hasActivity ? (
            <EmptyState
              icon={<Coins />}
              title="No activity yet"
              description="Once tips start landing your recent activity will show here."
            />
          ) : (
            <div className="space-y-4">
              {recentTips.map((tip) => (
                <TipCard key={`${tip.from}-${tip.timestamp}`} tip={tip} showReceiver={false} />
              ))}
              {recentTips.length === 0 && (
                <p className="text-sm text-gray-500">No individual tip records loaded yet.</p>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* Stats strip */}
      {stats && (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Platform creators</p>
            <p className="text-2xl font-black">{stats.totalCreators.toLocaleString()}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Platform tips</p>
            <p className="text-2xl font-black">{stats.totalTipsCount.toLocaleString()}</p>
          </Card>
          <Card className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Platform volume</p>
            <AmountDisplay amount={stats.totalTipsVolume} className="text-2xl" />
          </Card>
        </section>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tips tab
// ---------------------------------------------------------------------------
interface TipsTabProps {
  tips: ReturnType<typeof useDashboard>["tips"];
  loading: boolean;
}

const TIPS_PER_PAGE = 5;

const TipsTab: React.FC<TipsTabProps> = ({ tips, loading }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(tips.length / TIPS_PER_PAGE));
  const paginated = tips.slice((page - 1) * TIPS_PER_PAGE, page * TIPS_PER_PAGE);

  return (
    <div className="space-y-4 pt-6">
      <Card className="space-y-4" padding="lg">
        <h2 className="text-2xl font-black uppercase">Tip history</h2>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rect" height="4rem" />
            ))}
          </div>
        ) : tips.length === 0 ? (
          <EmptyState
            icon={<Coins />}
            title="No tips yet"
            description="Your incoming tip history will appear here once you start receiving tips."
          />
        ) : (
          <>
            <div className="space-y-4">
              {paginated.map((tip) => (
                <TipCard key={`${tip.from}-${tip.timestamp}`} tip={tip} showReceiver={false} />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Earnings tab
// ---------------------------------------------------------------------------
interface EarningsTabProps {
  profile: NonNullable<ReturnType<typeof useDashboard>["profile"]>;
  stats: ReturnType<typeof useDashboard>["stats"];
  loading: boolean;
}

const EarningsTab: React.FC<EarningsTabProps> = ({ profile, stats, loading }) => {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const hasEarnings = profile.totalTipsCount > 0;

  // Fee rate from global stats; fall back to 0 if not loaded yet.
  const feeBps = stats?.feeBps ?? 0;
  const feePercent = (feeBps / 100).toFixed(2);

  // Build a simple bar-style chart from the last few months of volume.
  // Since on-chain tip-history is not yet queryable, we use the single known
  // total and represent it as one bar occupying 100 % of its own scale.
  const balanceXlm = stroopToXlm(new BigNumber(profile.balance)).toNumber();
  const totalXlm = stroopToXlm(new BigNumber(profile.totalTipsReceived)).toNumber();

  return (
    <div className="space-y-6 pt-6">
      {/* Earnings chart (simplified bar) */}
      <Card className="space-y-4" padding="lg">
        <div className="flex items-center gap-2">
          <BarChart2 size={20} />
          <h2 className="text-2xl font-black uppercase">Earnings overview</h2>
        </div>

        {loading ? (
          <Skeleton variant="rect" height="8rem" />
        ) : !hasEarnings ? (
          <EmptyState
            icon={<BarChart2 />}
            title="No earnings data"
            description="Your earnings chart will populate as you receive tips."
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase text-gray-500">
                <span>Lifetime received</span>
                <AmountDisplay amount={profile.totalTipsReceived} />
              </div>
              <div className="h-6 w-full border-2 border-black bg-gray-100">
                <div className="h-full bg-black" style={{ width: "100%" }} />
              </div>
            </div>

            {balanceXlm > 0 && totalXlm > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black uppercase text-gray-500">
                  <span>Available to withdraw</span>
                  <AmountDisplay amount={profile.balance} />
                </div>
                <div className="h-6 w-full border-2 border-black bg-gray-100">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: `${Math.min(100, Math.round((balanceXlm / totalXlm) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Withdraw panel */}
      <Card className="space-y-4" padding="lg">
        <h2 className="text-xl font-black uppercase">Withdraw earnings</h2>
        <div className="border-2 border-black bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Ready to withdraw</p>
          {loading ? (
            <Skeleton variant="text" width="50%" />
          ) : (
            <AmountDisplay amount={profile.balance} className="mt-2 block text-xl" />
          )}
        </div>
        {feeBps > 0 && (
          <p className="text-xs text-gray-500">
            Platform fee: <span className="font-bold">{feePercent}%</span> deducted at withdrawal.
          </p>
        )}
        <Button
          variant="primary"
          icon={<ArrowDownToLine size={16} />}
          onClick={() => setWithdrawOpen(true)}
          disabled={loading || balanceXlm === 0}
        >
          Withdraw
        </Button>
      </Card>

      {/* Withdraw modal */}
      <Modal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Confirm withdrawal"
      >
        <div className="space-y-4">
          <div className="border-2 border-black p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Amount</p>
            <AmountDisplay amount={profile.balance} className="mt-1 block text-xl" />
          </div>
          {feeBps > 0 && (
            <p className="text-sm text-gray-600">
              A {feePercent}% platform fee will be deducted. You will receive approximately{" "}
              <strong>
                {stroopToXlm(
                  new BigNumber(profile.balance).times(1 - feeBps / 10000),
                ).toFormat(2)}{" "}
                XLM
              </strong>
              .
            </p>
          )}
          <p className="text-sm text-gray-500">
            Withdrawal execution will be wired once on-chain submit is available (issue #71).
          </p>
          <div className="flex gap-3">
            <Button variant="primary" disabled>
              Confirm (coming soon)
            </Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------
interface SettingsTabProps {
  profile: NonNullable<ReturnType<typeof useDashboard>["profile"]>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ profile }) => {
  const tipUrl = `https://tipz.app/@${profile.username}`;

  return (
    <div className="space-y-6 pt-6">
      {/* Profile info */}
      <Card className="space-y-3" padding="lg">
        <h2 className="text-xl font-black uppercase">Profile</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="font-bold uppercase text-gray-500">Username</span>
            <span className="font-black">@{profile.username}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="font-bold uppercase text-gray-500">Display name</span>
            <span className="font-black">{profile.displayName || "—"}</span>
          </div>
          {profile.xHandle && (
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="font-bold uppercase text-gray-500">X handle</span>
              <span className="font-black">@{profile.xHandle}</span>
            </div>
          )}
        </div>
        <Link to="/profile/edit">
          <Button variant="outline" size="sm">Edit profile</Button>
        </Link>
      </Card>

      {/* Share link */}
      <Card className="space-y-3" padding="lg">
        <h2 className="text-xl font-black uppercase">Share your tip link</h2>
        <ShareLink username={profile.username} />
      </Card>

      {/* QR code placeholder */}
      <Card className="space-y-3" padding="lg">
        <div className="flex items-center gap-2">
          <QrCode size={20} />
          <h2 className="text-xl font-black uppercase">QR code</h2>
        </div>
        <p className="text-sm text-gray-600">
          Scan to open your tip page: <span className="font-bold">{tipUrl}</span>
        </p>
        <div className="flex h-32 w-32 items-center justify-center border-2 border-black bg-gray-100">
          <div className="text-center">
            <QrCode size={48} className="mx-auto text-gray-400" />
            <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">QR coming soon</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main DashboardPage
// ---------------------------------------------------------------------------
const DashboardPage: React.FC = () => {
  const { connected } = useWalletStore();
  const { profile, tips, stats, loading, error, refetch } = useDashboard();

  // Not connected — prompt wallet connection
  if (!connected) {
    return (
      <PageContainer maxWidth="xl" className="space-y-8 py-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
              Creator dashboard
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-4xl font-black uppercase">
              <LayoutDashboard size={32} />
              Dashboard
            </h1>
          </div>
          <WalletConnect />
        </section>
        <EmptyState
          icon={<Wallet />}
          title="Connect your wallet"
          description="Connect a Stellar wallet to view your dashboard."
        />
      </PageContainer>
    );
  }

  // Connected but not registered
  if (!loading && !profile) {
    return (
      <PageContainer maxWidth="xl" className="space-y-8 py-10">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
              Creator dashboard
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-4xl font-black uppercase">
              <LayoutDashboard size={32} />
              Dashboard
            </h1>
          </div>
          <WalletConnect />
        </section>
        <EmptyState
          icon={<LayoutDashboard />}
          title="No profile found"
          description="Register a creator profile to unlock your dashboard."
        />
        <div className="flex justify-center">
          <Link to="/register">
            <Button variant="primary">Register now</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      content: profile ? (
        <OverviewTab profile={profile} stats={stats} tips={tips} loading={loading} />
      ) : null,
    },
    {
      id: "tips",
      label: "Tips",
      content: <TipsTab tips={tips} loading={loading} />,
    },
    {
      id: "earnings",
      label: "Earnings",
      content: profile ? (
        <EarningsTab profile={profile} stats={stats} loading={loading} />
      ) : null,
    },
    {
      id: "settings",
      label: "Settings",
      content: profile ? <SettingsTab profile={profile} /> : null,
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="space-y-8 py-10">
      {/* Page header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
            Creator dashboard
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-black uppercase">
            <LayoutDashboard size={32} />
            {profile?.displayName || profile?.username || "Dashboard"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            icon={<Settings size={14} />}
            aria-label="Refresh dashboard"
          >
            Refresh
          </Button>
          <WalletConnect />
        </div>
      </section>

      {/* Error banner (non-fatal — stale data still shown) */}
      {error && (
        <div
          role="alert"
          className="border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
        >
          {error} — showing cached data.
        </div>
      )}

      {/* Tabbed content */}
      <Tabs tabs={tabs} defaultTab="overview" />
    </PageContainer>
  );
};

export default DashboardPage;
