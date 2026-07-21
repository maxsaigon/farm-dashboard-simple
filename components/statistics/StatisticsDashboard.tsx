'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useSimpleAuth } from '@/lib/optimized-auth-context'
import { subscribeToTrees } from '@/lib/firestore'
import { subscribeToInvestments } from '@/lib/investment-service'
import { calculateSeasonStatistics, percentageChange } from '@/lib/season-statistics'
import type { Investment, Tree } from '@/lib/types'

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
})
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

function ChangeLabel({ current, comparison, inverse = false }: { current: number, comparison: number, inverse?: boolean }) {
  const change = percentageChange(current, comparison)
  if (change === null) return <span className="text-xs text-gray-500">Chưa có số liệu để so sánh</span>
  if (change === 0) return <span className="text-xs font-medium text-gray-600">Không thay đổi</span>

  const increased = change > 0
  const favorable = inverse ? !increased : increased
  const Icon = increased ? ArrowTrendingUpIcon : ArrowTrendingDownIcon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${favorable ? 'text-green-700' : 'text-orange-700'}`}>
      <Icon className="h-4 w-4" />
      {increased ? 'Tăng' : 'Giảm'} {number.format(Math.abs(change))}%
    </span>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  current,
  comparison,
  inverse = false,
  tone
}: {
  label: string
  value: string
  hint: string
  current: number
  comparison: number
  inverse?: boolean
  tone: 'green' | 'blue' | 'amber' | 'violet'
}) {
  const tones = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    violet: 'bg-violet-50 border-violet-200'
  }

  return (
    <section className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-950">{value}</p>
      <p className="mt-1 text-xs text-gray-600">{hint}</p>
      <div className="mt-3"><ChangeLabel current={current} comparison={comparison} inverse={inverse} /></div>
    </section>
  )
}

function ComparisonRow({ label, current, comparison, format = number.format }: {
  label: string
  current: number
  comparison: number
  format?: (value: number) => string
}) {
  const difference = current - comparison
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <th className="py-3 pr-3 text-left text-sm font-medium text-gray-700">{label}</th>
      <td className="px-2 py-3 text-right text-sm font-semibold text-gray-900">{format(current)}</td>
      <td className="px-2 py-3 text-right text-sm text-gray-600">{format(comparison)}</td>
      <td className={`py-3 pl-2 text-right text-sm font-semibold ${difference > 0 ? 'text-green-700' : difference < 0 ? 'text-orange-700' : 'text-gray-500'}`}>
        {difference > 0 ? '+' : ''}{format(difference)}
      </td>
    </tr>
  )
}

export default function StatisticsDashboard() {
  const { user, currentFarm, selectedSeasonYear } = useSimpleAuth()
  const seasons = useMemo(() => {
    const available = currentFarm?.seasons?.length ? currentFarm.seasons : [selectedSeasonYear]
    return Array.from(new Set(available)).sort((a, b) => b - a)
  }, [currentFarm?.seasons, selectedSeasonYear])
  const [viewYear, setViewYear] = useState(selectedSeasonYear)
  const [comparisonYear, setComparisonYear] = useState<number | null>(null)
  const [trees, setTrees] = useState<Tree[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [treesLoaded, setTreesLoaded] = useState(false)
  const [investmentsLoaded, setInvestmentsLoaded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    setViewYear(selectedSeasonYear)
  }, [selectedSeasonYear])

  useEffect(() => {
    const fallback = seasons.find(year => year !== viewYear) ?? null
    if (comparisonYear === viewYear || (comparisonYear !== null && !seasons.includes(comparisonYear))) {
      setComparisonYear(fallback)
    } else if (comparisonYear === null) {
      setComparisonYear(fallback)
    }
  }, [comparisonYear, seasons, viewYear])

  useEffect(() => {
    if (!user || !currentFarm?.id) return
    setTreesLoaded(false)
    setInvestmentsLoaded(false)
    const unsubscribeTrees = subscribeToTrees(currentFarm.id, user.uid, items => {
      setTrees(items.filter(tree => tree.farmId === currentFarm.id))
      setTreesLoaded(true)
    })
    const unsubscribeInvestments = subscribeToInvestments(user.uid, currentFarm.id, items => {
      setInvestments(items)
      setInvestmentsLoaded(true)
    })
    return () => {
      unsubscribeTrees?.()
      unsubscribeInvestments?.()
    }
  }, [currentFarm?.id, user])

  const current = useMemo(
    () => calculateSeasonStatistics(trees, investments, viewYear),
    [investments, trees, viewYear]
  )
  const comparison = useMemo(
    () => calculateSeasonStatistics(trees, investments, comparisonYear ?? viewYear),
    [comparisonYear, investments, trees, viewYear]
  )
  const progress = current.eligibleTrees > 0 ? (current.recordedTrees / current.eligibleTrees) * 100 : 0
  const comparisonProgress = comparison.eligibleTrees > 0 ? (comparison.recordedTrees / comparison.eligibleTrees) * 100 : 0
  const maxCategory = Math.max(...current.expensesByCategory.map(item => item.amount), 1)
  const maxMonth = Math.max(...current.monthlyExpenses, 1)

  if (!treesLoaded || !investmentsLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />
          <p className="mt-4 text-gray-600">Đang tổng hợp số liệu mùa vụ...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <Link href="/map" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-green-700">
            <ArrowLeftIcon className="h-5 w-5" /> Quay lại bản đồ
          </Link>
          <div className="mt-2 flex items-start gap-3">
            <div className="rounded-2xl bg-green-100 p-3"><ChartBarIcon className="h-7 w-7 text-green-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-gray-950">Thống Kê mùa vụ</h1>
              <p className="mt-1 text-sm text-gray-600">{currentFarm?.name}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">
            Mùa đang xem
            <select value={viewYear} onChange={event => setViewYear(Number(event.target.value))} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base font-bold text-blue-800">
              {seasons.map(year => <option key={year} value={year}>Mùa {year}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-700">
            So sánh với
            <select value={comparisonYear ?? ''} onChange={event => setComparisonYear(event.target.value ? Number(event.target.value) : null)} disabled={seasons.length < 2} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3 text-base font-bold text-gray-800 disabled:bg-gray-100">
              {seasons.length < 2 && <option value="">Chưa có mùa khác</option>}
              {seasons.filter(year => year !== viewYear).map(year => <option key={year} value={year}>Mùa {year}</option>)}
            </select>
          </label>
        </section>

        {comparisonYear === null && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <ExclamationCircleIcon className="h-6 w-6 shrink-0" /> Chưa có mùa vụ khác để so sánh.
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard label="Tổng số trái" value={`${number.format(current.totalFruit)} trái`} hint={`${current.recordedTrees} cây đã đếm`} current={current.totalFruit} comparison={comparison.totalFruit} tone="green" />
          <SummaryCard label="Tiến độ đếm" value={`${number.format(progress)}%`} hint={`${current.recordedTrees}/${current.eligibleTrees} cây cần đếm`} current={progress} comparison={comparisonProgress} tone="blue" />
          <SummaryCard label="Tiền đã chi" value={currency.format(current.totalExpense)} hint={`${current.expenseCount} khoản chi`} current={current.totalExpense} comparison={comparison.totalExpense} inverse tone="amber" />
          <SummaryCard label="Chi phí mỗi cây" value={currency.format(current.expensePerEligibleTree)} hint="Tính trên cây cần đếm" current={current.expensePerEligibleTree} comparison={comparison.expensePerEligibleTree} inverse tone="violet" />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-7 w-7 text-green-600" />
            <div><h2 className="text-lg font-bold text-gray-950">Kết quả đếm trái</h2><p className="text-sm text-gray-600">Mùa {viewYear}</p></div>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-green-600" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-green-50 p-3"><strong className="block text-xl text-green-800">{current.recordedTrees}</strong><span className="text-xs text-gray-600">Đã đếm</span></div>
            <div className="rounded-xl bg-orange-50 p-3"><strong className="block text-xl text-orange-800">{current.missingTrees}</strong><span className="text-xs text-gray-600">Chưa đếm</span></div>
            <div className="rounded-xl bg-gray-100 p-3"><strong className="block text-xl text-gray-800">{current.notApplicableTrees}</strong><span className="text-xs text-gray-600">Cây non</span></div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-700">Trung bình <strong>{number.format(current.averageFruitPerRecordedTree)} trái</strong> trên mỗi cây đã đếm</p>
          {current.missingTrees > 0 && <Link href="/map" className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-green-600 px-4 font-semibold text-white">Mở bản đồ để tiếp tục đếm</Link>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><BanknotesIcon className="h-7 w-7 text-amber-600" /><div><h2 className="text-lg font-bold text-gray-950">Chi tiêu theo hạng mục</h2><p className="text-sm text-gray-600">{current.expenseCount} khoản trong mùa {viewYear}</p></div></div>
          {current.expensesByCategory.length === 0 ? <p className="mt-5 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">Chưa ghi nhận chi tiêu cho mùa này.</p> : (
            <div className="mt-5 space-y-4">
              {current.expensesByCategory.map(item => (
                <div key={item.category}>
                  <div className="mb-1 flex justify-between gap-3 text-sm"><span className="font-semibold text-gray-800">{item.category}</span><span className="text-gray-700">{currency.format(item.amount)}</span></div>
                  <div className="h-3 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${(item.amount / maxCategory) * 100}%` }} /></div>
                  <p className="mt-1 text-xs text-gray-500">{item.count} khoản chi</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">So sánh mùa {viewYear}{comparisonYear ? ` và ${comparisonYear}` : ''}</h2>
          {comparisonYear ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px]"><thead><tr className="border-b border-gray-200 text-xs uppercase text-gray-500"><th className="py-3 text-left">Thông số</th><th className="px-2 text-right">{viewYear}</th><th className="px-2 text-right">{comparisonYear}</th><th className="text-right">Chênh lệch</th></tr></thead>
                <tbody>
                  <ComparisonRow label="Tổng trái" current={current.totalFruit} comparison={comparison.totalFruit} />
                  <ComparisonRow label="Cây đã đếm" current={current.recordedTrees} comparison={comparison.recordedTrees} />
                  <ComparisonRow label="Tiến độ đếm" current={progress} comparison={comparisonProgress} format={value => `${number.format(value)}%`} />
                  <ComparisonRow label="Trái/cây đã đếm" current={current.averageFruitPerRecordedTree} comparison={comparison.averageFruitPerRecordedTree} />
                  <ComparisonRow label="Tổng chi phí" current={current.totalExpense} comparison={comparison.totalExpense} format={currency.format} />
                  <ComparisonRow label="Số khoản chi" current={current.expenseCount} comparison={comparison.expenseCount} />
                  <ComparisonRow label="Chi phí/cây" current={current.expensePerEligibleTree} comparison={comparison.expensePerEligibleTree} format={currency.format} />
                </tbody>
              </table>
            </div>
          ) : <p className="mt-3 text-sm text-gray-600">Hãy tạo thêm mùa vụ để sử dụng phần so sánh.</p>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button onClick={() => setShowDetails(value => !value)} className="flex min-h-14 w-full items-center justify-between px-5 text-left font-bold text-gray-900">
            Chi tiết theo khu vực
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          {showDetails && <div className="border-t border-gray-100 px-5 pb-5">
            {current.zones.length === 0 ? <p className="pt-4 text-sm text-gray-600">Chưa có cây cần đếm trong mùa này.</p> : current.zones.map(zone => {
              const zoneProgress = zone.eligibleTrees > 0 ? (zone.recordedTrees / zone.eligibleTrees) * 100 : 0
              return <div key={zone.zone} className="border-b border-gray-100 py-4 last:border-0"><div className="flex justify-between gap-3"><strong className="text-gray-900">{zone.zone}</strong><span className="text-sm font-semibold text-green-700">{number.format(zone.totalFruit)} trái</span></div><p className="mt-1 text-sm text-gray-600">Đã đếm {zone.recordedTrees}/{zone.eligibleTrees} cây · {number.format(zoneProgress)}%</p></div>
            })}
          </div>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Chi tiêu từng tháng</h2>
          <p className="mt-1 text-sm text-gray-600">Mùa {viewYear}</p>
          <div className="mt-5 grid grid-cols-6 gap-2 sm:grid-cols-12">
            {current.monthlyExpenses.map((amount, index) => (
              <div key={index} className="flex min-h-36 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-medium text-gray-600">{amount > 0 ? `${number.format(amount / 1000000)}tr` : ''}</span>
                <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-amber-50">
                  <div className="w-full rounded-lg bg-amber-500" style={{ height: `${amount > 0 ? Math.max((amount / maxMonth) * 100, 6) : 0}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-600">T{index + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
