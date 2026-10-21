import { useState } from "react";
import { counters, redeemCoin } from "../store/session";

export default function Novcici() {
  const [c, setC] = useState(counters());
  const [confirming, setConfirming] = useState(false);

  async function redeem() {
    setConfirming(false);
    setC(await redeemCoin());
  }

  return (
    <div className="wallet">
      <p className="wallet-big">Новчићи: {c.coins}</p>
      <p>Дуге: {c.rainbows}</p>
      <p>Најдужи низ: {c.bestStreak}</p>
      {confirming ? (
        <div>
          <button type="button" onClick={redeem}>
            Да, уновчи
          </button>{" "}
          <button type="button" onClick={() => setConfirming(false)}>
            Не
          </button>
        </div>
      ) : (
        <button type="button" disabled={c.coins <= 0} onClick={() => setConfirming(true)}>
          Уновчи један
        </button>
      )}
    </div>
  );
}
