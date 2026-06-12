import Link from "next/link";

// ===== 首页：咨询师/机构介绍 =====
// 下面的文案是占位内容，直接改成你们真实的介绍即可
export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero：呼吸圆 + 标语 */}
      <section className="flex flex-col items-center gap-10 pt-10 text-center md:flex-row md:text-left">
        <div className="breath-circle h-44 w-44 shrink-0 md:h-56 md:w-56" aria-hidden />
        <div>
          <p className="text-sm tracking-widest text-pine">跟随圆的节奏，做三次深呼吸</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-snug md:text-5xl">
            把心里的话，
            <br />
            说给愿意听的人
          </h1>
          <p className="mt-4 max-w-md text-ink/70">
            学业压力、人际困扰、情绪低落……无论大事小事，这里都有一段安静的时间留给你。
          </p>
          <Link href="/book" className="btn-primary mt-8">
            预约一次咨询
          </Link>
        </div>
      </section>

      {/* 咨询师简介 */}
      <section className="card">
        <h2 className="font-display text-2xl font-bold">关于咨询师</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3 text-sm leading-7 text-ink/80">
            <p>
              丁丁老师，国家二级心理咨询师，从事学校心理健康教育工作 10
              年，累计个体咨询 1500+ 小时。擅长青少年情绪疏导、学业压力调适、人际关系与家庭沟通议题。
            </p>
            <p>
              咨询取向以人本主义为基础，结合认知行为疗法（CBT）。相信每个人都有自我成长的力量，咨询师的角色是陪伴你找到它。
            </p>
          </div>
          <ul className="space-y-2 text-sm text-ink/70">
            <li className="rounded-xl bg-pine-soft px-4 py-2">国家二级心理咨询师</li>
            <li className="rounded-xl bg-pine-soft px-4 py-2">中国心理学会会员</li>
            <li className="rounded-xl bg-pine-soft px-4 py-2">个体咨询 1500+ 小时</li>
          </ul>
        </div>
      </section>

      {/* 预约流程 */}
      <section>
        <h2 className="font-display text-2xl font-bold">预约流程</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["选择时段", "在日历中挑选方便的日期和时间"],
            ["填写信息", "留下联系方式和想聊的话题"],
            ["等待确认", "咨询师确认后状态变为「已确认」"],
            ["准时赴约", "提前 5 分钟到达，手机静音"],
          ].map(([t, d], i) => (
            <div key={t} className="card !p-5">
              <div className="text-xs font-medium text-amber">第 {i + 1} 步</div>
              <div className="mt-1 font-display text-lg font-bold">{t}</div>
              <p className="mt-1 text-sm text-ink/60">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink/60">
          温馨提示：如需取消，请至少提前 48 小时在「我的预约」中操作；咨询内容严格保密。
        </p>
      </section>
    </div>
  );
}
