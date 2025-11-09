const Header = () => (
  <header className="flex flex-col gap-2 text-center sm:text-left">
    <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">
      サウンドスケッチャー
    </p>
    <h1
      className="text-3xl font-semibold"
      aria-label="Create beats at the speed of inspiration."
    >
      ひらめいたビートを、すぐカタチに。
    </h1>
    <p className="text-sm text-zinc-400">
      キーボードを叩いてタイムラインに残し、AIに展開を相談して、映像編集や曲作りの素案を素早く共有できます。
    </p>
  </header>
);

export default Header;
