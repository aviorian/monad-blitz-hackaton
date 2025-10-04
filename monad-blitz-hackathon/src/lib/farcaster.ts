export interface FarcasterAuthor {
  fid: number;
  displayName?: string;
  username?: string;
  followerCount?: number;
  followingCount?: number;
  pfp?: {
    url?: string;
    verified?: boolean;
  };
}

export interface FarcasterCast {
  hash: string;
  author: FarcasterAuthor;
  text?: string;
  timestamp?: number;
  replies?: {
    count?: number;
  };
  reactions?: {
    count?: number;
  };
  recasts?: {
    count?: number;
  };
  watches?: {
    count?: number;
  };
}

export interface AuthorInteractionStats {
  fid: number;
  displayName?: string;
  username?: string;
  pfpUrl?: string;
  followerCount?: number;
  followingCount?: number;
  totalCasts: number;
  totalReplies: number;
  totalReactions: number;
  totalRecasts: number;
  totalWatches: number;
  totalEngagement: number;
  totalPoints: number;
}

export const aggregateAuthorStats = (casts: FarcasterCast[]): AuthorInteractionStats[] => {
  const map = new Map<number, AuthorInteractionStats>();

  for (const cast of casts) {
    const { author } = cast;

    if (!author?.fid) {
      continue;
    }

    const existing = map.get(author.fid);

    const replies = cast.replies?.count ?? 0;
    const reactions = cast.reactions?.count ?? 0;
    const recasts = cast.recasts?.count ?? 0;
    const watches = cast.watches?.count ?? 0;
    const engagement = replies + reactions + recasts;
    const points = reactions * 1 + replies * 1.2 + recasts * 1.6;

    if (existing) {
      existing.totalCasts += 1;
      existing.totalReplies += replies;
      existing.totalReactions += reactions;
      existing.totalRecasts += recasts;
      existing.totalWatches += watches;
      existing.totalEngagement += engagement;
      existing.totalPoints += points;
      continue;
    }

    map.set(author.fid, {
      fid: author.fid,
      displayName: author.displayName,
      username: author.username,
      pfpUrl: author.pfp?.url,
      followerCount: author.followerCount,
      followingCount: author.followingCount,
      totalCasts: 1,
      totalReplies: replies,
      totalReactions: reactions,
      totalRecasts: recasts,
      totalWatches: watches,
      totalEngagement: engagement,
      totalPoints: points,
    });
  }

  return Array.from(map.values())
    .filter((author) => author.totalPoints > 0)
    .sort((a, b) => {
      if (b.totalPoints === a.totalPoints) {
        return b.totalCasts - a.totalCasts;
      }

      return b.totalPoints - a.totalPoints;
    });
};
