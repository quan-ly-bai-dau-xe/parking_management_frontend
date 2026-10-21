export default function StatCard({ children, className="" }) {
    return (
        <div className={`bg-white rounder-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md
        transition-shadow flex flex-col justift-between ${className}`}>
            {children}
        </div>
    )
}