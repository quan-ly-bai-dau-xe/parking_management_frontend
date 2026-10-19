import React, { useState } from "react";

/**
 * HelloWorld Component
 * Hiển thị giao diện Hello World hoàn chỉnh với Tailwind CSS & dữ liệu từ mock data
 */
const HelloWorld = ({ data }) => {
  const [likes, setLikes] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        Không có dữ liệu hiển thị.
      </div>
    );
  }

  const { title, subtitle, welcomeMessage, status, features, stats, author } =
    data;

  return (
    <div className="max-w-4xl mx-auto my-8 px-4 sm:px-6">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {status}
            </span>
            <span className="text-xs text-blue-100 font-medium tracking-wide">
              v{author?.version} • {author?.environment}
            </span>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-base sm:text-lg text-blue-100 font-light">
            {subtitle}
          </p>

          <div className="mt-6 rounded-xl bg-white/10 p-4 backdrop-blur-sm border border-white/20">
            <p className="text-sm sm:text-base font-medium text-white">
              👋 {welcomeMessage}
            </p>
          </div>

          {/* Interactive Button */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setLikes((prev) => prev + 1)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-50 active:scale-95"
            >
              <span>❤️ Thả tim ({likes})</span>
            </button>
            <button
              type="button"
              onClick={() =>
                alert(
                  "Hệ thống HelloWorld với Tailwind CSS hoạt động hoàn hảo!",
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700/60 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700/80 active:scale-95"
            >
              <span>🔔 Kiểm tra thông báo</span>
            </button>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-purple-500/20 blur-2xl"></div>
      </div>

      {/* Stats Section */}
      {stats && stats.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="text-sm font-medium text-slate-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-emerald-600 font-medium">
                {stat.change}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Features Section */}
      {features && features.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">
              Tính năng nổi bật
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  activeTab === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({features.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600">
                      #{feature.id}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-blue-600">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-blue-600 flex items-center gap-1 group-hover:underline">
                  Khám phá thêm &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-400 border-t border-slate-200 pt-4">
        Được phát triển bởi{" "}
        <span className="font-semibold text-slate-600">{author?.name}</span> •
        Tailwind CSS v4 & React
      </footer>
    </div>
  );
};

export default HelloWorld;
