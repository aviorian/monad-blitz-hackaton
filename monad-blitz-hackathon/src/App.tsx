import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { useAccount, useConnect, useSignMessage, useSwitchChain } from "wagmi";
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
          <h1>Monad Farcaster Mini App</h1>
          <p>Track the latest Monad-focused Farcaster activity in a single dashboard.</p>
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
          <SignButton />
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

function SignButton() {
  const { signMessage, isPending, data, error } = useSignMessage();

  return (
    <div className="sign-block">
      <button type="button" onClick={() => signMessage({ message: "hello world" })} disabled={isPending}>
        {isPending ? "Signing..." : "Sign message"}
      </button>
      {data ? (
        <div className="signature">
          <span className="label">Signature</span>
          <code>{data}</code>
        </div>
      ) : null}
      {error ? <div className="error">{error.message}</div> : null}
    </div>
  );
}

function formatAddress(value?: string) {
  if (!value) {
    return "-";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default App;
