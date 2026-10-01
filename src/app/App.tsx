const party = [
  ['유비', '2,120'],
  ['관우', '3,128'],
  ['장비', '3,180'],
];

export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">황건적의 난</p>
          <h1>탁군</h1>
        </div>
        <button className="icon-button" type="button" aria-label="설정">☰</button>
      </header>

      <section className="world-card" aria-label="게임 월드 미리보기">
        <div className="map-label">탁현 남부 평야</div>
        <div className="map-road" />
        <div className="player-marker" aria-label="유비군">劉</div>
        <div className="enemy-marker" aria-label="황건군">黃</div>
        <p className="hint">필드를 터치하여 이동</p>
      </section>

      <section className="quest-card">
        <p className="eyebrow">현재 목표</p>
        <strong>탁현 남쪽의 황건군 움직임을 확인하십시오.</strong>
      </section>

      <section className="party-card" aria-label="현재 부대">
        {party.map(([name, troops]) => (
          <article className="general" key={name}>
            <div className="portrait-placeholder" aria-hidden="true">{name[0]}</div>
            <div>
              <strong>{name}</strong>
              <span>병력 {troops}</span>
            </div>
          </article>
        ))}
      </section>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <button type="button">부대</button>
        <button type="button" className="primary">탐험</button>
        <button type="button">지도</button>
      </nav>
    </main>
  );
}
