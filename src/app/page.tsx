export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-10 pt-10 text-center md:flex-row md:text-left">
        <div className="breath-circle h-44 w-44 shrink-0 md:h-56 md:w-56" aria-hidden />
        <div>
          <p className="text-sm tracking-widest text-pine">跟随圆的节奏，做三次深呼吸</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-snug md:text-5xl">
            心语预约
            <br />
            <span className="text-2xl font-normal text-ink/60 md:text-3xl">心理咨询预约平台</span>
          </h1>
          <p className="mt-4 max-w-md text-ink/70">
            连接来访者与咨询师的安心桥梁
          </p>
        </div>
      </section>

      {/* 三步流程 */}
      <section>
        <h2 className="font-display text-2xl font-bold">如何预约</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["收到专属链接", "联系您的咨询师，获取 ta 的专属预约链接"],
            ["注册账号", "用邮箱注册一个账号，几秒即可完成"],
            ["选择时段完成预约", "挑选合适的时段，填写信息，提交预约"],
          ].map(([t, d], i) => (
            <div key={t} className="card !p-5">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-pine text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="font-display text-lg font-bold">{t}</div>
              <p className="mt-1 text-sm text-ink/60">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 提示 */}
      <section className="card border-pine/20 bg-pine-soft text-center">
        <p className="text-sm text-pine">
          如需预约，请联系您的咨询师获取专属链接
        </p>
        <p className="mt-1 text-xs text-ink/50">
          咨询内容严格保密 · 如需取消请提前 48 小时操作
        </p>
      </section>
    </div>
  );
}
