import { sdk as miniappSdk } from "@farcaster/miniapp-sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { type Address, parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { monadTestnet } from "wagmi/chains";
import type { AuthorInteractionStats, FarcasterCast } from "../lib/farcaster";
import { aggregateAuthorStats } from "../lib/farcaster";
import { type NeynarUser, fetchNeynarUsers } from "../lib/neynar";
import { COMMUNITY_TIP_RAIL_ABI, COMMUNITY_TIP_RAIL_ADDRESS } from "../lib/tipRail";

const FARCASTER_ENDPOINT = "https://client.farcaster.xyz/v2/search-casts";
const SEARCH_TERMS = [
  "monad",
  "gmonad",
  "monadbft",
  "monaddb",
  "monad momentum",
  "monad testnet",
  "monad mainnet",
  "monad tps",
  "monad airdrop",
  "monad parallel",
  "monad lately",
  "monad latency",
  "monad dose",
  "monad cast",
  "monad optimistic",
  "monad execution",
  "monad asynchronous",
  "monad evm compatible",
  "monad layer 1",
  "monad L1",
  "monad ethereum",
  "monad mon",
  "monad launchpad",
  "monad decentralization",
  "monad nads",
  "monad nad",
  "monad protocol",
  "monad project",
  "monad evm",
  "execution layer monad",
  "monad scalability",
  "monad fast",
  "monad speed",
  "10k tps",
  "10.000 tps",
  "monad low",
  "monad low fee",
  "monadl1",
  "monadcommunity",
  "monad smart contract",
  "monad smartcontract",
  "monad blockchain",
  "monad crypto",
  "monad onchain",
  "monad builders",
  "monad build",
  "monad buidl",
  "monad devs",
  "monad developers",
  "monaddev",
  "monad hackathon",
  "deploy on monad",
  "monad dapp",
  "monad fam",
  "monad crew",
  "gm monad",
  "monad love",
  "monad move",
  "monad memes",
  "monad gem",
  "monad data",
  "monad onchain",
  "monad nft",
] as const;
const BLOCKED_FIDS = new Set<number>([282172, 1114650]);

type MindshareStat = AuthorInteractionStats & { mindshare: number };
type ProfileState = {
  isLoading: boolean;
  fid?: number;
  error?: string;
};

interface FarcasterSearchResponse {
  result?: {
    casts?: FarcasterCast[];
  };
}

interface LoadingState {
  isLoading: boolean;
  error?: string;
}

const initialLoadingState: LoadingState = {
  isLoading: true,
  error: undefined,
};

async function fetchCastsForTerm(term: string, signal?: AbortSignal): Promise<FarcasterCast[]> {
  const query = encodeURIComponent(`${term} sort:recent`);
  const response = await fetch(`${FARCASTER_ENDPOINT}?q=${query}&limit=${import.meta.env.VITE_FETCH_LIMIT}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request for term "${term}" failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FarcasterSearchResponse;
  return payload.result?.casts ?? [];
}

export function MonadAuthorStats() {
  const [stats, setStats] = useState<AuthorInteractionStats[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(initialLoadingState);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<NeynarUser | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<NeynarUser[]>([]);
  const [selectedCustodyAddresses, setSelectedCustodyAddresses] = useState<string[]>([]);
  const [profileState, setProfileState] = useState<ProfileState>({ isLoading: false });
  const [isCustomAmountOpen, setIsCustomAmountOpen] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState("");
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { isConnected, chainId } = useAccount();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: {
      enabled: Boolean(txHash),
    },
  });

  const isSending = isWritePending || isConfirming;
  const hasRecipients = selectedCustodyAddresses.length > 0;
  const isWrongNetwork = Boolean(chainId) && chainId !== monadTestnet.id;
  const sendButtonsDisabled = isSending || !hasRecipients || !isConnected || isWrongNetwork;

  const formatHash = useCallback((hash: `0x${string}`) => `${hash.slice(0, 6)}…${hash.slice(-4)}`, []);
  const formatCustodyAddress = useCallback((value?: string | null) => {
    if (!value) {
      return "Custody address unavailable";
    }

    if (value.length <= 10) {
      return value;
    }

    const prefix = value.slice(0, 6);
    const suffix = value.slice(-4);
    return `${prefix}…${suffix}`;
  }, []);

  const pointsFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  }, []);

  const percentageFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }, []);

  const numberFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US");
  }, []);

  const fetchCasts = useCallback(async (signal?: AbortSignal) => {
    setLoadingState({ isLoading: true });
    setWarning(null);

    try {
      const results = await Promise.allSettled(SEARCH_TERMS.map((term) => fetchCastsForTerm(term, signal)));

      if (signal?.aborted) {
        return;
      }

      const aggregated: FarcasterCast[] = [];
      const failedTerms: string[] = [];

      results.forEach((result, index) => {
        const term = SEARCH_TERMS[index];

        if (result.status === "fulfilled") {
          aggregated.push(...result.value);
          return;
        }

        const reason = result.reason as Error;

        if (reason?.name === "AbortError") {
          return;
        }

        failedTerms.push(term);
      });

      if (failedTerms.length === SEARCH_TERMS.length) {
        setStats([]);
        setLoadingState({ isLoading: false, error: "Unable to load data. Please try again." });
        return;
      }

      if (failedTerms.length > 0) {
        setWarning(`Some filters failed to load: ${failedTerms.join(", ")}`);
      }

      const filteredAggregated = aggregated.filter((cast) => !BLOCKED_FIDS.has(cast.author?.fid ?? -1));

      if (filteredAggregated.length === 0) {
        setStats([]);
        setLoadingState({ isLoading: false });
        return;
      }

      const uniqueCasts = Array.from(new Map(filteredAggregated.map((cast) => [cast.hash, cast])).values());

      setStats(aggregateAuthorStats(uniqueCasts));
      setLastUpdated(new Date());
      setLoadingState({ isLoading: false });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message : "Unexpected error";
      setStats([]);
      setLoadingState({ isLoading: false, error: message });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchCasts(controller.signal);
    return () => controller.abort();
  }, [fetchCasts]);

  const { mindshareStats, totalPoints } = useMemo((): {
    mindshareStats: MindshareStat[];
    totalPoints: number;
  } => {
    if (stats.length === 0) {
      return { mindshareStats: [], totalPoints: 0 };
    }

    const total = stats.reduce((sum, author) => sum + author.totalPoints, 0);

    if (total === 0) {
      return { mindshareStats: [], totalPoints: 0 };
    }

    const decorated = stats
      .map((author) => ({
        ...author,
        mindshare: author.totalPoints / total,
      }))
      .sort((a, b) => b.mindshare - a.mindshare);

    return { mindshareStats: decorated, totalPoints: total };
  }, [stats]);

  const hasResults = mindshareStats.length > 0;

  const subtitle = useMemo(() => {
    if (loadingState.isLoading) {
      return "Loading data...";
    }

    if (loadingState.error) {
      return "We ran into a problem fetching the feed";
    }

    return hasResults ? "Mindshare summary for the Monad community" : "No matching casts found";
  }, [hasResults, loadingState.error, loadingState.isLoading]);

  const handleRetry = () => {
    void fetchCasts();
  };

  const handleAuthorClick = (fid: number) => {
    void miniappSdk.actions.viewProfile({ fid });

    setProfileState({ isLoading: true, fid });

    void fetchNeynarUsers([fid])
      .then((users) => {
        const user = users[0];

        if (!user) {
          setSelectedUser(null);
          setProfileState({ isLoading: false, fid, error: "No profile data returned." });
          return;
        }

        setSelectedUser(user);
        setProfileState({ isLoading: false, fid });

        setSelectedUsers((previous) => {
          if (previous.some((entry) => entry.fid === user.fid)) {
            return previous;
          }

          return [...previous, user];
        });

        const custodyAddress = user.custody_address;

        if (custodyAddress) {
          setSelectedCustodyAddresses((previous) => {
            if (previous.includes(custodyAddress)) {
              return previous;
            }

            return [...previous, custodyAddress];
          });
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to fetch profile.";
        setProfileState({ isLoading: false, fid, error: message });
      });
  };

  const handleRemoveSelected = useCallback(
    (fid: number) => {
      const removedUser = selectedUsers.find((user) => user.fid === fid);
      const remainingUsers = selectedUsers.filter((user) => user.fid !== fid);

      setSelectedUsers(remainingUsers);

      if (removedUser?.custody_address) {
        const target = removedUser.custody_address.toLowerCase();
        const stillUsed = remainingUsers.some((user) => user.custody_address?.toLowerCase() === target);

        if (!stillUsed) {
          setSelectedCustodyAddresses((addresses) => addresses.filter((address) => address.toLowerCase() !== target));
        }
      }

      if (selectedUser?.fid === fid) {
        setSelectedUser(null);
      }

      if (remainingUsers.length === 0) {
        setIsCustomAmountOpen(false);
        setCustomAmountInput("");
        setCustomAmountError(null);
        setSendError(null);
      }
    },
    [selectedUser, selectedUsers],
  );

  const handleSendMon = useCallback(
    async (amountMon: string): Promise<boolean> => {
      if (selectedCustodyAddresses.length === 0) {
        setSendError("Select at least one author with a custody address.");
        return false;
      }

      if (!isConnected) {
        setSendError("Connect a wallet to send MON.");
        return false;
      }

      if (!chainId || chainId !== monadTestnet.id) {
        setSendError("Switch to Monad Testnet to send MON.");
        return false;
      }

      try {
        setSendError(null);
        setCustomAmountError(null);
        setTxHash(undefined);
        const perRecipient = parseEther(amountMon);

        if (perRecipient <= 0n) {
          setSendError("Amount must be greater than 0 MON.");
          return false;
        }

        const recipients = selectedCustodyAddresses.map((address) => ({
          recipient: address as Address,
          amount: perRecipient,
        }));

        const totalValue = perRecipient * BigInt(recipients.length);

        const hash = await writeContractAsync({
          address: COMMUNITY_TIP_RAIL_ADDRESS,
          abi: COMMUNITY_TIP_RAIL_ABI,
          functionName: "tipBatchNative",
          args: [recipients],
          value: totalValue,
        });

        setTxHash(hash);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send MON.";
        setSendError(message);
        return false;
      }
    },
    [selectedCustodyAddresses, isConnected, chainId, writeContractAsync],
  );

  const handleCustomAmountClick = () => {
    setIsCustomAmountOpen(true);
    setCustomAmountError(null);
    setSendError(null);
  };

  const handleCustomAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCustomAmountInput(event.target.value);

    if (customAmountError) {
      setCustomAmountError(null);
    }

    if (sendError) {
      setSendError(null);
    }
  };

  const handleCustomAmountCancel = () => {
    setIsCustomAmountOpen(false);
    setCustomAmountInput("");
    setCustomAmountError(null);
    setSendError(null);
  };

  const handleCustomAmountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (customAmountInput.trim().length === 0) {
      setCustomAmountError("Enter a MON amount.");
      return;
    }

    if (selectedCustodyAddresses.length === 0) {
      setCustomAmountError("No custody addresses selected for MON transfer.");
      return;
    }

    const parsedAmount = Number(customAmountInput);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setCustomAmountError("Please enter a valid MON amount greater than 0.");
      return;
    }

    const wasQueued = await handleSendMon(customAmountInput);

    if (wasQueued) {
      setIsCustomAmountOpen(false);
      setCustomAmountInput("");
      setCustomAmountError(null);
    }
  };

  return (
    <>
      <section className="monad-author-stats">
        <header>
          <h1>Monad Engagement Dashboard</h1>
          <p>{subtitle}</p>
          {lastUpdated && !loadingState.isLoading ? (
            <p className="timestamp">Last updated: {lastUpdated.toLocaleTimeString()}</p>
          ) : null}
        </header>

        {warning && !loadingState.isLoading ? <div className="state warning">{warning}</div> : null}

        {loadingState.isLoading ? <div className="state">Fetching data...</div> : null}

        {loadingState.error && !loadingState.isLoading ? (
          <div className="state error">
            <p>An error occurred: {loadingState.error}</p>
            <button type="button" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : null}

        {!loadingState.isLoading && !loadingState.error && hasResults ? (
          <>
            <div className="meta-row">
              <div className="totals">
                <span>Total points</span>
                <strong>{pointsFormatter.format(totalPoints)}</strong>
              </div>
              <button type="button" onClick={handleRetry} disabled={loadingState.isLoading}>
                Refresh
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Profile</th>
                  <th>Casts</th>
                  <th>Reactions</th>
                  <th>Replies</th>
                  <th>Recasts</th>
                  <th className="numeric">Points</th>
                  <th className="numeric">Mindshare</th>
                </tr>
              </thead>
              <tbody>
                {mindshareStats.map((author, index) => (
                  <tr key={author.fid}>
                    <td>{index + 1}</td>
                    <td className="author">
                      {author.pfpUrl ? <img alt="Profile avatar" src={author.pfpUrl} /> : null}
                      <button type="button" className="author-button" onClick={() => handleAuthorClick(author.fid)}>
                        <strong>{author.displayName || author.username || `FID ${author.fid}`}</strong>
                        {author.username ? <span>@{author.username}</span> : null}
                      </button>
                    </td>
                    <td>{author.totalCasts}</td>
                    <td>{author.totalReactions}</td>
                    <td>{author.totalReplies}</td>
                    <td>{author.totalRecasts}</td>
                    <td className="numeric">{pointsFormatter.format(author.totalPoints)}</td>
                    <td className="numeric">{percentageFormatter.format(author.mindshare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="profile-panel">
              {profileState.isLoading ? (
                <p>Loading Neynar profile for FID {profileState.fid}...</p>
              ) : profileState.error ? (
                <p className="profile-error">{profileState.error}</p>
              ) : selectedUser ? (
                <div className="profile-details">
                  {selectedUser.pfp_url ? <img alt="Selected profile avatar" src={selectedUser.pfp_url} /> : null}
                  <div className="profile-copy">
                    <h2>{selectedUser.display_name || selectedUser.username}</h2>
                    <p className="handle">@{selectedUser.username}</p>
                    {selectedUser.profile?.bio?.text ? <p className="bio">{selectedUser.profile.bio.text}</p> : null}
                    <dl>
                      <div>
                        <dt>Followers</dt>
                        <dd>{numberFormatter.format(selectedUser.follower_count)}</dd>
                      </div>
                      <div>
                        <dt>Following</dt>
                        <dd>{numberFormatter.format(selectedUser.following_count)}</dd>
                      </div>
                      <div>
                        <dt>Power badge</dt>
                        <dd>{selectedUser.power_badge ? "Yes" : "No"}</dd>
                      </div>
                      {selectedUser.score !== undefined ? (
                        <div>
                          <dt>Spam score</dt>
                          <dd>{numberFormatter.format(selectedUser.score)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                </div>
              ) : (
                <p>Select an author to load Farcaster profile details.</p>
              )}
            </div>
          </>
        ) : null}
      </section>

      {selectedUsers.length > 0 ? (
        <div className="selection-drawer" aria-live="polite">
          <div className="selection-drawer__content">
            <div className="selection-drawer__header">
              <strong>Selected authors</strong>
              <span>{selectedUsers.length} total</span>
            </div>
            <ul className="selection-drawer__list">
              {selectedUsers.map((user) => (
                <li key={user.fid}>
                  <span className="selection-drawer__name">{user.display_name || user.username}</span>
                  <span className="selection-drawer__address">{formatCustodyAddress(user.custody_address)}</span>
                  <button
                    type="button"
                    className="selection-drawer__remove"
                    onClick={() => handleRemoveSelected(user.fid)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="selection-drawer__actions">
            <button
              type="button"
              disabled={sendButtonsDisabled}
              onClick={() => {
                void handleSendMon("0.1");
              }}
            >
              Send 0.1 MON
            </button>
            <button
              type="button"
              disabled={sendButtonsDisabled}
              onClick={() => {
                void handleSendMon("0.5");
              }}
            >
              Send 0.5 MON
            </button>
            {isCustomAmountOpen ? (
              <form className="selection-drawer__custom" onSubmit={handleCustomAmountSubmit}>
                <input
                  aria-label="Custom MON amount"
                  inputMode="decimal"
                  min="0"
                  step="0.0001"
                  type="number"
                  placeholder="Amount"
                  value={customAmountInput}
                  onChange={handleCustomAmountChange}
                  disabled={isSending}
                />
                <button type="submit" disabled={isSending}>
                  Send
                </button>
                <button type="button" onClick={handleCustomAmountCancel} disabled={isSending}>
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" disabled={sendButtonsDisabled} onClick={handleCustomAmountClick}>
                Send any MON
              </button>
            )}
          </div>
          {isCustomAmountOpen && customAmountError ? (
            <p className="selection-drawer__error">{customAmountError}</p>
          ) : null}
          {sendError ? <p className="selection-drawer__error">{sendError}</p> : null}
          {!hasRecipients ? (
            <p className="selection-drawer__status">Selected profiles do not expose custody addresses.</p>
          ) : null}
          {isWrongNetwork ? <p className="selection-drawer__status">Switch to Monad Testnet to send MON.</p> : null}
          {!isConnected ? <p className="selection-drawer__status">Connect your wallet to send MON.</p> : null}
          {isWritePending ? <p className="selection-drawer__status">Confirm the transaction in your wallet…</p> : null}
          {isConfirming ? (
            <p className="selection-drawer__status">Transaction submitted, waiting for confirmation…</p>
          ) : null}
          {isConfirmed && txHash ? (
            <p className="selection-drawer__status selection-drawer__status--success">
              Tip batch confirmed ({formatHash(txHash)}).
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export default MonadAuthorStats;
