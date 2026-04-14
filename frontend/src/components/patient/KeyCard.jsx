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
    card: { background: "#ffffff", padding: "1.8rem", borderRadius: "1.8rem", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
    h3: { margin: "0 0 1.25rem", color: "#13544a", fontSize: "1.2rem", fontWeight: 600 },
    section: { marginBottom: "1.5rem" },
    label: { fontWeight: 600, color: "#1e293b", marginBottom: "0.25rem", fontSize: "0.95rem" },
    note: { color: "#475569", fontSize: "0.85rem", margin: "0.25rem 0 0.75rem" },
    keyBox: { display: "flex", alignItems: "center", gap: "0.75rem", background: "#f8fafc", padding: "0.85rem 1.1rem", borderRadius: "1rem", border: "1px solid #e2e8f0" },
    key: { flex: 1, wordBreak: "break-all", color: "#256a5c", fontSize: "0.85rem", fontFamily: "monospace", fontWeight: 500 },
    copyBtn: { padding: "0.5rem 1rem", background: "#badd93", color: "#13544a", border: "none", borderRadius: "0.8rem", cursor: "pointer", fontSize: "0.85rem", whiteSpace: "nowrap", fontWeight: 600 },
    steps: { color: "#475569", fontSize: "0.85rem", paddingLeft: "1.2rem", lineHeight: 1.8 },
    warning: { background: "#fee2e2", color: "#991b1b", padding: "0.8rem 1rem", borderRadius: "1rem", fontSize: "0.85rem", marginTop: "0.75rem", border: "1px solid #fecaca" },
};
