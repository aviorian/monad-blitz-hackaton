import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { monadTestnet } from "wagmi/chains";
import { MonadAuthorStats } from "./components/MonadAuthorStats";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <main className="app">
      <header className="app-header">
        <div className="app-meta">
          <h1>Monad Rank</h1>
          <p>Measure Monad ecosystem mindshare on Farcaster at a glance with Monad Rank.</p>
        </div>
        <ConnectMenu />
      </header>

      <MonadAuthorStats />
    </main>
  );
}

function ConnectMenu() {
  const { isConnected, address, chainId, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();

  const primaryConnector = connectors?.[0];
  const canSwitchChain = typeof switchChain === "function";

  const handleConnect = () => {
    if (!primaryConnector) {
      return;
    }

    connect({ connector: primaryConnector, chainId: monadTestnet.id });
  };

  if (isConnected) {
    const isWrongNetwork = chainId !== monadTestnet.id;
    const networkLabel = isWrongNetwork
      ? `Network: ${chain?.name ?? `Chain ${chainId ?? "-"}`}`
      : "Network: Monad Testnet";

    return (
      <div className="connection-state">
        <span className="label">Connected account</span>
        <span className="address">{formatAddress(address)}</span>
        <span className={`network${isWrongNetwork ? " network-wrong" : ""}`}>{networkLabel}</span>
        {isWrongNetwork ? (
          canSwitchChain ? (
            <button
              type="button"
              className="connect-button"
              onClick={() => switchChain?.({ chainId: monadTestnet.id })}
              disabled={isSwitchPending}
            >
              {isSwitchPending ? "Switching..." : "Switch to Monad Testnet"}
            </button>
          ) : (
            <p className="network-warning">Switch to Monad Testnet in your wallet.</p>
          )
        ) : (
            <p className="network-ready">You're ready to explore Monad Rank insights.</p>
        )}
      </div>
    );
  }

  return (
    <button type="button" className="connect-button" onClick={handleConnect} disabled={!primaryConnector}>
      {primaryConnector ? `Connect with ${primaryConnector.name}` : "No available connector"}
    </button>
  );
}

function formatAddress(value?: string) {
  if (!value) {
    return "-";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default App;
