import { ExternalLink } from "lucide-react";
import React from "react";

interface XHandleLinkProps {
  handle: string;
  followers?: number;
}

const formatFollowers = (followers: number): string => {
  if (followers >= 1_000_000) {
    const value = followers / 1_000_000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}M`;
  }

  if (followers >= 1_000) {
    const value = followers / 1_000;
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}K`;
  }

  return followers.toLocaleString();
};

const XHandleLink: React.FC<XHandleLinkProps> = ({ handle, followers }) => {
  const normalizedHandle = handle.trim().replace(/^@+/, "");

  if (!normalizedHandle) {
    return null;
  }

  const followersText =
    typeof followers === "number"
      ? ` • ${formatFollowers(followers)} followers`
      : "";

  return (
    <a
      href={`https://x.com/${normalizedHandle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 underline underline-offset-2 transition-colors hover:text-black"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black text-[10px] font-black">
        X
      </span>
      <span>
        @{normalizedHandle}
        {followersText}
      </span>
      <ExternalLink size={14} />
    </a>
  );
};

export default XHandleLink;
