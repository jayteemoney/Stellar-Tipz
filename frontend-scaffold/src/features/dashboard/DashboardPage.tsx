import React from "react";
import { LayoutDashboard, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import PageContainer from "@/components/layout/PageContainer";
import WalletConnect from "@/components/shared/WalletConnect";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Tabs from "@/components/ui/Tabs";
import { useDashboard } from "@/hooks/useDashboard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWalletStore } from "@/store/walletStore";

import OverviewTab from "./OverviewTab";
import SettingsTab from "./SettingsTab";
import TipsTab from "./TipsTab";

const DashboardPage: React.FC = () => {
  usePageTitle("Dashboard");

  const { connected } = useWalletStore();
  const { profile, loading } = useDashboard();

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

  if (loading && !profile) {
    return (
      <PageContainer maxWidth="xl" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-10">
        <Loader size="lg" text="Loading dashboard" />
      </PageContainer>
    );
  }

  if (!profile) {
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
      content: (
        <div className="pt-6">
          <OverviewTab />
        </div>
      ),
    },
    {
      id: "tips",
      label: "Tips",
      content: (
        <div className="pt-6">
          <TipsTab />
        </div>
      ),
    },
    {
      id: "earnings",
      label: "Earnings",
      content: (
        <div className="pt-6">
          <Card padding="lg">
            <p className="text-sm font-bold text-gray-700">
              Earnings insights and charts will appear here once contract-backed
              analytics are connected.
            </p>
          </Card>
        </div>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      content: (
        <div className="pt-6">
          <SettingsTab profile={profile} />
        </div>
      ),
    },
  ];

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
          {profile.displayName ? (
            <p className="mt-2 text-sm font-bold text-gray-600">
              {profile.displayName}
            </p>
          ) : null}
        </div>
        <WalletConnect />
      </section>

      <Tabs tabs={tabs} defaultTab="overview" />
    </PageContainer>
  );
};

export default DashboardPage;
