"use client";
import { useState } from "react";

export default function KeyCard({ address }) {
    const [copied, setCopied] = useState(false);

    async function copy(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "absolute";
                textArea.style.left = "-999999px";
                document.body.prepend(textArea);
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }

    return (
        <div style={S.card}>
            <h3 style={S.h3}>🔑 Your Wallet Keys</h3>

            <div style={S.section}>
                <p style={S.label}>Public Key (Wallet Address)</p>
                <p style={S.note}>
                    This is your patient ID on the blockchain. Share it with hospitals
                    so they can look up your records.
                </p>
                <div style={S.keyBox}>
                    <code style={S.key}>{address}</code>
                    <button style={S.copyBtn} onClick={() => copy(address)}>
                        {copied ? "✓ Copied" : "Copy"}
                    </button>
                </div>
            </div>

            <div style={S.section}>
                <p style={S.label}>Private Key</p>
                <p style={S.note}>
                    Your private key is stored securely inside MetaMask and is
                    <strong> never</strong> exposed to this application. To view it:
                </p>
                <ol style={S.steps}>
                    <li>Open MetaMask</li>
                    <li>Click the three-dot menu next to your account name</li>
                    <li>Select <strong>Account details</strong></li>
                    <li>Click <strong>Show private key</strong> and enter your MetaMask password</li>
                </ol>
                <div style={S.warning}>
                    ⚠️ Never share your private key. Anyone with it controls your account.
                </div>
            </div>
        </div>
    );
}

const S = {
    card: { background: "#1e293b", padding: "1.5rem", borderRadius: "0.75rem" },
    h3: { margin: "0 0 1.25rem", color: "#f1f5f9", fontSize: "1.1rem" },
    section: { marginBottom: "1.5rem" },
    label: { fontWeight: 600, color: "#e2e8f0", marginBottom: "0.25rem", fontSize: "0.9rem" },
    note: { color: "#94a3b8", fontSize: "0.8rem", margin: "0.25rem 0 0.75rem" },
    keyBox: { display: "flex", alignItems: "center", gap: "0.75rem", background: "#0f172a", padding: "0.75rem 1rem", borderRadius: "0.5rem", border: "1px solid #334155" },
    key: { flex: 1, wordBreak: "break-all", color: "#38bdf8", fontSize: "0.8rem", fontFamily: "monospace" },
    copyBtn: { padding: "0.35rem 0.8rem", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: "0.4rem", cursor: "pointer", fontSize: "0.8rem", whiteSpace: "nowrap" },
    steps: { color: "#94a3b8", fontSize: "0.82rem", paddingLeft: "1.2rem", lineHeight: 1.8 },
    warning: { background: "#7c2d12", color: "#fca5a5", padding: "0.65rem 1rem", borderRadius: "0.5rem", fontSize: "0.82rem", marginTop: "0.75rem" },
};
