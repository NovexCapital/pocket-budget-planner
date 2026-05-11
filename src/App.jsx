import React, { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Trash2, Download, RefreshCcw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const STORAGE_KEY = "pocket_budget_planner_v1";
const categories = ["Home", "Transport", "Food", "Utilities", "Debt", "Savings", "Business", "Other"];
const colors = ["#34d399", "#22c55e", "#84cc16", "#14b8a6", "#a3e635", "#facc15", "#2dd4bf", "#86efac"];

const starter = {
  currency: "R",
  monthlyIncome: 16500,
  savingsGoal: 3000,
  currentSavings: 500,
  expenses: [
    { id: crypto.randomUUID(), name: "Rent / Home", amount: 3500, category: "Home", date: new Date().toISOString().slice(0, 10) },
    { id: crypto.randomUUID(), name: "Transport", amount: 1800, category: "Transport", date: new Date().toISOString().slice(0, 10) },
    { id: crypto.randomUUID(), name: "Food", amount: 2500, category: "Food", date: new Date().toISOString().slice(0, 10) },
  ],
  debts: [{ id: crypto.randomUUID(), name: "Credit account", balance: 1200, payment: 300 }],
};

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || starter;
  } catch {
    return starter;
  }
}

function money(value, currency = "R") {
  return `${currency}${Number(value || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [data, setData] = useState(loadData);
  const [expense, setExpense] = useState({ name: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10) });
  const [debt, setDebt] = useState({ name: "", balance: "", payment: "" });

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data]);

  const totals = useMemo(() => {
    const spent = data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const debtPayments = data.debts.reduce((s, d) => s + Number(d.payment || 0), 0);
    const debtBalance = data.debts.reduce((s, d) => s + Number(d.balance || 0), 0);
    const remaining = Number(data.monthlyIncome || 0) - spent - debtPayments;
    const progress = data.savingsGoal ? Math.min((data.currentSavings / data.savingsGoal) * 100, 100) : 0;
    return { spent, debtPayments, debtBalance, remaining, progress };
  }, [data]);

  const chartData = useMemo(() => {
    const grouped = data.expenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [data.expenses]);

  function addExpense() {
    if (!expense.name.trim() || !Number(expense.amount)) return;
    setData({ ...data, expenses: [{ id: crypto.randomUUID(), ...expense, amount: Number(expense.amount) }, ...data.expenses] });
    setExpense({ name: "", amount: "", category: "Food", date: new Date().toISOString().slice(0, 10) });
  }

  function addDebt() {
    if (!debt.name.trim() || !Number(debt.balance)) return;
    setData({ ...data, debts: [{ id: crypto.randomUUID(), name: debt.name, balance: Number(debt.balance), payment: Number(debt.payment || 0) }, ...data.debts] });
    setDebt({ name: "", balance: "", payment: "" });
  }

  function exportCSV() {
    const rows = [["Type", "Name", "Amount", "Category", "Date"]];
    data.expenses.forEach((e) => rows.push(["Expense", e.name, e.amount, e.category, e.date]));
    data.debts.forEach((d) => rows.push(["Debt", d.name, d.balance, `Monthly payment: ${d.payment}`, ""]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "budget-planner.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <main className="phone-frame">
        <header className="header">
          <div><p className="eyebrow">Pocket Budget</p><h1>Budget Planner</h1></div>
          <div className="icon-badge"><Wallet size={26} /></div>
        </header>

        <section className="hero-card">
          <div className="hero-top"><div><p>Available after expenses</p><h2 className={totals.remaining < 0 ? "negative" : ""}>{money(totals.remaining, data.currency)}</h2></div><span>This month</span></div>
          <div className="mini-grid">
            <MiniStat label="Income" value={money(data.monthlyIncome, data.currency)} />
            <MiniStat label="Spent" value={money(totals.spent, data.currency)} />
            <MiniStat label="Debt" value={money(totals.debtBalance, data.currency)} />
          </div>
        </section>

        <nav className="tabs">
          {[["home", "Home"], ["spend", "Spend"], ["goals", "Goals"], ["setup", "Setup"]].map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={tab === key ? "active" : ""}>{label}</button>)}
        </nav>

        {tab === "home" && <section className="section-stack">
          <Card title="Spending by category">
            <div className="chart-box"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>{chartData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie><Tooltip formatter={(v) => money(v, data.currency)} /></PieChart></ResponsiveContainer></div>
            <div className="category-grid">{chartData.map((i) => <div className="category-pill" key={i.name}><p>{i.name}</p><strong>{money(i.value, data.currency)}</strong></div>)}</div>
          </Card>
          <Card title="Savings progress"><div className="progress"><div style={{ width: `${totals.progress}%` }} /></div><p className="muted">{money(data.currentSavings, data.currency)} saved of {money(data.savingsGoal, data.currency)}.</p></Card>
        </section>}

        {tab === "spend" && <section className="section-stack">
          <Card title="Add spending"><input placeholder="What did you pay for?" value={expense.name} onChange={(e) => setExpense({ ...expense, name: e.target.value })} /><input type="number" placeholder="Amount" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} /><div className="two-cols"><select value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select><input type="date" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} /></div><button className="primary-btn" onClick={addExpense}><Plus size={18} /> Add expense</button></Card>
          <List>{data.expenses.map((item) => <ListItem key={item.id} title={item.name} subtitle={`${item.category} • ${item.date}`} amount={money(item.amount, data.currency)} onDelete={() => setData({ ...data, expenses: data.expenses.filter((e) => e.id !== item.id) })} />)}</List>
        </section>}

        {tab === "goals" && <section className="section-stack">
          <Card title="Savings goal"><input type="number" value={data.savingsGoal} onChange={(e) => setData({ ...data, savingsGoal: Number(e.target.value) })} /><input type="number" value={data.currentSavings} onChange={(e) => setData({ ...data, currentSavings: Number(e.target.value) })} /><div className="progress"><div style={{ width: `${totals.progress}%` }} /></div></Card>
          <Card title="Debt tracker"><input placeholder="Debt name" value={debt.name} onChange={(e) => setDebt({ ...debt, name: e.target.value })} /><div className="two-cols"><input type="number" placeholder="Balance" value={debt.balance} onChange={(e) => setDebt({ ...debt, balance: e.target.value })} /><input type="number" placeholder="Payment" value={debt.payment} onChange={(e) => setDebt({ ...debt, payment: e.target.value })} /></div><button className="secondary-btn" onClick={addDebt}><Plus size={18} /> Add debt</button></Card>
          <List>{data.debts.map((item) => <ListItem key={item.id} title={item.name} subtitle={`Payment: ${money(item.payment, data.currency)} / month`} amount={money(item.balance, data.currency)} onDelete={() => setData({ ...data, debts: data.debts.filter((d) => d.id !== item.id) })} />)}</List>
        </section>}

        {tab === "setup" && <section className="section-stack"><Card title="Monthly setup"><input type="number" value={data.monthlyIncome} onChange={(e) => setData({ ...data, monthlyIncome: Number(e.target.value) })} /><select value={data.currency} onChange={(e) => setData({ ...data, currency: e.target.value })}><option value="R">South African Rand - R</option><option value="$">US Dollar - $</option><option value="€">Euro - €</option><option value="£">Pound - £</option></select><button className="primary-btn" onClick={exportCSV}><Download size={18} /> Export CSV</button><button className="outline-btn" onClick={() => setData(starter)}><RefreshCcw size={18} /> Reset demo data</button></Card><div className="note">Your data is saved locally on this phone/browser. Later we can add login, cloud sync, and encrypted storage.</div></section>}
      </main>
    </div>
  );
}

function Card({ title, children }) { return <div className="card"><h3>{title}</h3>{children}</div>; }
function MiniStat({ label, value }) { return <div className="mini-stat"><p>{label}</p><strong>{value}</strong></div>; }
function List({ children }) { return <div className="list">{children}</div>; }
function ListItem({ title, subtitle, amount, onDelete }) { return <div className="list-item"><div><strong>{title}</strong><p>{subtitle}</p></div><div className="amount-box"><strong>{amount}</strong><button onClick={onDelete} className="delete-btn"><Trash2 size={16} /></button></div></div>; }
