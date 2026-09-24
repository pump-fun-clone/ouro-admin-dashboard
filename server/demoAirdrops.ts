/** Demo airdrop history when MONITOR_URL is unset. */
export function demoAirdrops() {
  const cash = "0x020bfc650a365f8bb26819deaabf3e21291018b4";
  const pons = "0x39dbed3a2bd333467115de45665cc57f813c4571";
  const ai = "0x2e8c31162b855a2ffa90f6f8634643ad6f111e18";
  const now = Math.floor(Date.now() / 1000);
  const epochs = Array.from({ length: 24 }, (_, i) => {
    const epoch = 227 - i;
    const ts = now - i * 7200;
    const ponsAmt = 8 + (i % 5) * 0.4;
    const aiAmt = 22 + (i % 4) * 0.8;
    const cashAmt = 30 + (i % 6) * 1.2;
    const ponsUsd = ponsAmt * 0.63;
    const aiUsd = aiAmt * 0.24;
    const cashUsd = cashAmt * 0.16;
    const paidUsd = ponsUsd + aiUsd + cashUsd;
    const tx = `0x${(epoch + 1000).toString(16).padStart(64, "0")}`;
    const assets = [
      {
        address: pons,
        symbol: "PONS",
        decimals: 18,
        amount: String(BigInt(Math.floor(ponsAmt * 1e18))),
        amountF: ponsAmt,
        usd: ponsUsd,
        recipients: 110 + (i % 20),
      },
      {
        address: ai,
        symbol: "AI",
        decimals: 18,
        amount: String(BigInt(Math.floor(aiAmt * 1e18))),
        amountF: aiAmt,
        usd: aiUsd,
        recipients: 105 + (i % 18),
      },
      {
        address: cash,
        symbol: "CASHCAT",
        decimals: 18,
        amount: String(BigInt(Math.floor(cashAmt * 1e18))),
        amountF: cashAmt,
        usd: cashUsd,
        recipients: 108 + (i % 22),
      },
    ];
    return {
      epoch,
      status: "closed",
      distributor: "0x0bd09d209292c3359885addbf9cf94a7aecc369f",
      startTs: ts,
      endTs: ts,
      startBlock: 71000000 - i * 70000,
      endBlock: 71000000 - i * 70000,
      paidUsd,
      costUsd: null,
      recipients: 100 + (i % 40),
      holders: null,
      eligibleTokens: null,
      txs: 1,
      assets,
      payouts: [
        {
          tx,
          block: 71000000 - i * 70000,
          ts,
          paidUsd,
          recipients: 100 + (i % 40),
          assets,
        },
      ],
      meta: { txs: [tx] },
      byob: {
        byobRecipients: 4 + (i % 5),
        classicRecipients: 90 + (i % 30),
        byobUsd: paidUsd * 0.12,
        classicUsd: paidUsd * 0.88,
        byobShareBps: 1200,
        receiptRecipients: 100 + (i % 40),
        assets: [
          {
            address: pons,
            symbol: "PONS",
            byobRecipients: 4 + (i % 3),
            classicRecipients: 90 + (i % 20),
            byobAmountF: ponsAmt * 0.15,
            classicAmountF: ponsAmt * 0.85,
            byobUsd: ponsUsd * 0.15,
            classicUsd: ponsUsd * 0.85,
            byobShareBps: 1500,
          },
          {
            address: ai,
            symbol: "AI",
            byobRecipients: 3 + (i % 4),
            classicRecipients: 85 + (i % 18),
            byobAmountF: aiAmt * 0.1,
            classicAmountF: aiAmt * 0.9,
            byobUsd: aiUsd * 0.1,
            classicUsd: aiUsd * 0.9,
            byobShareBps: 1000,
          },
          {
            address: cash,
            symbol: "CASHCAT",
            byobRecipients: 2 + (i % 3),
            classicRecipients: 88 + (i % 22),
            byobAmountF: cashAmt * 0.08,
            classicAmountF: cashAmt * 0.92,
            byobUsd: cashUsd * 0.08,
            classicUsd: cashUsd * 0.92,
            byobShareBps: 800,
          },
        ],
      },
    };
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = now - (6 - i) * 86400;
    const dayEpochs = epochs.filter((e) => e.endTs >= day && e.endTs < day + 86400);
    return {
      day,
      epochs: dayEpochs.length || 3 + (i % 4),
      paid_usd: dayEpochs.reduce((s, e) => s + (e.paidUsd ?? 0), 0) || 80 + i * 12,
      cost_usd: null,
      recipients: dayEpochs.reduce((s, e) => s + (e.recipients ?? 0), 0) || 300 + i * 40,
      tax_usd: 100 + i * 30,
    };
  });

  return {
    explorer: "https://robinhoodchain.blockscout.com",
    epochs,
    days,
  };
}
