(() => {
  "use strict";

  const STORAGE_KEY = "pocketBudget.v1";
  const categories = {
    expense: [
      // Food is split into selectable subcategories for more useful tracking.
      { name: "Meal", label: "Meal", group: "Food", icon: "🍲" },
      { name: "Online order", label: "Online order", group: "Food", icon: "🛵" },
      { name: "Snacks", label: "Snacks", group: "Food", icon: "🍪" },
      { name: "Food", label: "Food (older entries)", group: "Other / existing entries", icon: "🍲" },
      { name: "Transport", icon: "🚌" },
      { name: "Shopping", icon: "🛍️" }, { name: "Education", icon: "📚" },
      { name: "Bills", icon: "🧾" }, { name: "Health", icon: "💊" },
      { name: "Personal care", icon: "🧴" }, { name: "Entertainment", icon: "🎬" },
      { name: "Home", icon: "🏠" }, { name: "Other", icon: "✦" }
    ],
    income: [
      { name: "Allowance", icon: "💚" }, { name: "Salary", icon: "💼" },
      { name: "Freelance", icon: "💻" }, { name: "Gift", icon: "🎁" },
      { name: "Refund", icon: "↩" }, { name: "Other income", icon: "＋" }
    ]
  };
  const palette = ["#278465", "#d99a36", "#5688cf", "#c87570", "#8a79c6", "#52a6a0", "#d08b54", "#6d8f62", "#bd6c9b", "#8b9ca0"];
  const $ = (id) => document.getElementById(id);
  const now = new Date();
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const monthKey = (dateString) => String(dateString || "").slice(0, 7);
  const currentMonth = () => $("monthPicker").value || localDate(new Date()).slice(0, 7);
  const money = (value) => "Rs. " + Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const iconFor = (kind, category) => (categories[kind] || []).find(c => c.name === category)?.icon || (kind === "income" ? "＋" : "✦");
  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  function emptyData() {
    return { version: 1, transactions: [], overallBudgets: {}, categoryBudgets: {}, goals: [], updatedAt: new Date().toISOString() };
  }
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.transactions)) return emptyData();
      return {
        ...emptyData(), ...parsed,
        transactions: parsed.transactions.filter(t => t && typeof t.id === "string" && ["income","expense"].includes(t.kind) && Number.isFinite(Number(t.amount)) && typeof t.date === "string"),
        overallBudgets: parsed.overallBudgets && typeof parsed.overallBudgets === "object" ? parsed.overallBudgets : {},
        categoryBudgets: parsed.categoryBudgets && typeof parsed.categoryBudgets === "object" ? parsed.categoryBudgets : {},
        goals: Array.isArray(parsed.goals) ? parsed.goals.filter(g => g && typeof g.id === "string") : []
      };
    } catch (err) {
      console.error("Could not load local budget data", err);
      return emptyData();
    }
  }
  let data = loadData();
  let selectedKind = "expense";
  let toastTimer;
  function persist() {
    data.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      toast("Couldn't save. Your browser storage may be full or disabled.");
      console.error(err);
      return false;
    }
  }
  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function monthTransactions(month = currentMonth()) {
    return data.transactions.filter(t => monthKey(t.date) === month);
  }
  function totals(month = currentMonth()) {
    const list = monthTransactions(month);
    const income = list.filter(t => t.kind === "income").reduce((sum,t) => sum + Number(t.amount), 0);
    const expense = list.filter(t => t.kind === "expense").reduce((sum,t) => sum + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  }
  function fillCategorySelect(select, kind, includeAll = false) {
    const list = categories[kind] || categories.expense;
    let html = includeAll ? '<option value="">Choose a category</option>' : "";
    const groups = [...new Set(list.map(c => c.group || ""))];
    for (const group of groups) {
      const members = list.filter(c => (c.group || "") === group);
      const options = members.map(c => `<option value="${escapeHtml(c.name)}">${c.icon} ${escapeHtml(c.label || c.name)}</option>`).join("");
      html += group ? `<optgroup label="${escapeHtml(group)}">${options}</optgroup>` : options;
    }
    select.innerHTML = html;
  }
  function updateTransactionCategoryOptions() {
    fillCategorySelect($("transactionCategory"), selectedKind);
    $("transactionModalTitle").textContent = selectedKind === "income" ? "Add income" : "Add expense";
  }
  function renderOverview() {
    const t = totals();
    $("incomeTotal").textContent = money(t.income);
    $("expenseTotal").textContent = money(t.expense);
    $("availableBalance").textContent = money(t.balance);
    $("balanceCaption").textContent = `${new Date(currentMonth() + "-02T12:00:00").toLocaleDateString("en-LK", {month:"long", year:"numeric"})} · income minus expenses`;
    const limit = Number(data.overallBudgets[currentMonth()] || 0);
    $("overallBudget").textContent = limit > 0 ? money(limit) : "Not set";
    $("overallRemaining").textContent = limit > 0 ? money(limit - t.expense) : "—";
    const pct = limit > 0 ? (t.expense / limit) * 100 : 0;
    $("overallProgress").style.width = `${Math.min(100, pct)}%`;
    $("overallProgress").classList.toggle("over", limit > 0 && pct > 100);
    const budgetStatus = pct > 100
      ? `Over budget by ${money(t.expense - limit)}`
      : pct >= 100
        ? "Budget limit reached"
        : pct >= 80
          ? "You're approaching your budget limit"
          : `${money(t.expense)} spent of ${money(limit)}`;
    $("budgetUsedText").textContent = limit > 0 ? budgetStatus : "Set a limit to start tracking";
    $("budgetUsedText").classList.toggle("budget-warning", limit > 0 && pct >= 80);
    $("budgetUsedText").classList.toggle("budget-over", limit > 0 && pct >= 100);
    $("budgetPercent").textContent = limit > 0 ? `${Math.round(pct)}% used` : "—";
    $("chartTotal").textContent = money(t.expense);
  }
  function renderActivity() {
    const list = monthTransactions().slice().sort((a,b) => (b.date + (b.createdAt || "")).localeCompare(a.date + (a.createdAt || ""))).slice(0,4);
    const container = $("recentActivity");
    if (!list.length) {
      container.innerHTML = '<div class="empty-state"><span class="empty-emoji">✦</span><strong>No activity yet</strong><p>Add your first income or expense to get started.</p></div>';
      return;
    }
    container.innerHTML = list.map(t => `<div class="activity-row">
      <div class="category-icon">${iconFor(t.kind,t.category)}</div>
      <div class="activity-info"><strong>${escapeHtml(t.note || t.category)}</strong><small>${escapeHtml(t.category)} · ${escapeHtml(t.date)}</small></div>
      <div class="activity-amount ${t.kind === "income" ? "positive" : "negative"}">${t.kind === "income" ? "+" : "−"}${money(t.amount)}</div>
    </div>`).join("");
  }
  function renderChart() {
    const expenses = monthTransactions().filter(t => t.kind === "expense");
    const map = {};
    expenses.forEach(t => map[t.category] = (map[t.category] || 0) + Number(t.amount));
    const items = Object.entries(map).sort((a,b) => b[1]-a[1]);
    const max = items.length ? items[0][1] : 0;
    $("categoryChart").innerHTML = items.length ? items.slice(0,8).map(([name, amount], i) => `
      <div><div class="chart-line-head"><span>${escapeHtml(iconFor("expense",name))} ${escapeHtml(name)}</span><strong>${money(amount)}</strong></div>
      <div class="chart-track"><div class="chart-bar" style="width:${max ? amount/max*100 : 0}%;background:${palette[i % palette.length]}"></div></div></div>`).join("") :
      '<div class="empty-chart">Your category breakdown will appear here once you add expenses.</div>';
    $("categoryLegend").innerHTML = items.slice(0,5).map(([name], i) => `<span class="legend-item"><i class="legend-dot" style="background:${palette[i % palette.length]}"></i>${escapeHtml(name)}</span>`).join("");
  }
  function renderGoals() {
    const container = $("goalsList");
    if (!data.goals.length) {
      container.innerHTML = '<div class="empty-state compact"><span class="empty-emoji">◎</span><strong>No savings goals yet</strong><p>Give your next milestone a name.</p></div>';
      return;
    }
    container.innerHTML = data.goals.map(g => {
      const target = Math.max(0, Number(g.target) || 0), saved = Math.max(0, Number(g.saved) || 0);
      const pct = target ? saved/target*100 : 0;
      return `<article class="goal-card"><div class="goal-top"><div class="goal-title">◎ ${escapeHtml(g.name)}</div><div class="goal-actions"><button class="mini-button" data-goal-edit="${escapeHtml(g.id)}" aria-label="Edit ${escapeHtml(g.name)}">✎</button><button class="mini-button" data-goal-delete="${escapeHtml(g.id)}" aria-label="Delete ${escapeHtml(g.name)}">×</button></div></div>
      <div class="goal-amounts"><span><strong>${money(saved)}</strong> saved</span><span>Target <strong>${money(target)}</strong></span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,pct)}%"></div></div><div class="goal-foot"><span>${Math.round(pct)}% complete</span><span>${money(Math.max(0,target-saved))} to go</span></div></article>`;
    }).join("");
  }
  function renderCategoryBudgets() {
    const container = $("categoryBudgets");
    const entries = Object.entries(data.categoryBudgets[currentMonth()] || {});
    if (!entries.length) {
      container.innerHTML = '<div class="empty-state compact"><span class="empty-emoji">◷</span><strong>No category budgets yet</strong><p>Add a limit to see how much is left for each category.</p></div>';
      return;
    }
    container.innerHTML = entries.sort((a,b) => a[0].localeCompare(b[0])).map(([category, limit]) => {
      const spent = monthTransactions().filter(t => t.kind === "expense" && t.category === category).reduce((s,t) => s + Number(t.amount), 0);
      const pct = Number(limit) > 0 ? spent / Number(limit) * 100 : 0;
      const remaining = Number(limit) - spent;
      const amountLabel = remaining < 0 ? money(Math.abs(remaining)) : money(remaining);
      const remainingLabel = remaining < 0 ? "over" : "left";
      const warning = pct > 100 ? " · over budget" : pct >= 80 ? " · approaching limit" : "";
      return `<article class="category-budget-card"><div class="cat-budget-top"><div class="category-icon">${iconFor("expense",category)}</div><div class="cat-budget-main"><strong>${escapeHtml(category)}</strong><small>${money(spent)} of ${money(limit)} spent${warning}</small></div><div class="cat-budget-right ${spent > limit ? "negative" : ""}">${amountLabel}<small>${remainingLabel}</small></div><button class="mini-button" data-budget-delete="${escapeHtml(category)}" aria-label="Remove ${escapeHtml(category)} budget">×</button></div><div class="progress-track"><div class="progress-fill ${pct>100?"over":""}" style="width:${Math.min(100,pct)}%"></div></div></article>`;
    }).join("");
  }
  function renderAllTransactions() {
    const search = $("transactionSearch").value.trim().toLowerCase();
    const filter = $("typeFilter").value;
    const list = monthTransactions().filter(t => (filter === "all" || t.kind === filter) && `${t.category} ${t.note || ""}`.toLowerCase().includes(search)).slice().sort((a,b) => (b.date + (b.createdAt || "")).localeCompare(a.date + (a.createdAt || "")));
    $("allTransactions").innerHTML = list.length ? list.map(t => `<article class="transaction-row"><div class="category-icon">${iconFor(t.kind,t.category)}</div><div class="activity-info"><strong>${escapeHtml(t.note || t.category)}</strong><small>${escapeHtml(t.category)} · ${escapeHtml(t.date)}</small></div><div class="transaction-tools"><span class="activity-amount ${t.kind === "income" ? "positive" : "negative"}">${t.kind === "income" ? "+" : "−"}${money(t.amount)}</span><div><button class="mini-button" data-edit="${escapeHtml(t.id)}" aria-label="Edit transaction">✎</button> <button class="mini-button" data-delete="${escapeHtml(t.id)}" aria-label="Delete transaction">×</button></div></div></article>`).join("") : '<div class="empty-state compact"><strong>No matching transactions</strong><p>Try another search or add a transaction for this month.</p></div>';
  }
  function renderStorageStatus() {
    try {
      const used = new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
      $("storageStatus").textContent = `${data.transactions.length} transactions · approximately ${(used/1024).toFixed(1)} KB used in this browser.`;
    } catch { $("storageStatus").textContent = "Browser storage availability could not be checked."; }
  }
  function renderAll() {
    renderOverview(); renderActivity(); renderChart(); renderGoals(); renderCategoryBudgets(); renderAllTransactions(); renderStorageStatus();
  }
  function openDialog(id) {
    const d = $(id);
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open","");
  }
  function closeDialog(id) {
    const d = $(id);
    if (typeof d.close === "function") d.close(); else d.removeAttribute("open");
  }
  function openTransaction(kind = "expense", transaction = null) {
    selectedKind = kind;
    $("transactionForm").dataset.editId = transaction?.id || "";
    document.querySelectorAll("[data-kind]").forEach(btn => btn.classList.toggle("active", btn.dataset.kind === selectedKind));
    updateTransactionCategoryOptions();
    $("transactionAmount").value = transaction ? transaction.amount : "";
    $("transactionCategory").value = transaction ? transaction.category : (kind === "income" ? "Allowance" : "Food");
    $("transactionNote").value = transaction?.note || "";
    $("transactionDate").value = transaction?.date || localDate(new Date());
    $("transactionModalTitle").textContent = transaction ? "Edit transaction" : (kind === "income" ? "Add income" : "Add expense");
    openDialog("transactionDialog");
    setTimeout(() => $("transactionAmount").focus(), 60);
  }
  function downloadFile(name, content, type) {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportJson() {
    downloadFile(`pocket-budget-backup-${localDate(new Date())}.json`, JSON.stringify({...data, exportedAt: new Date().toISOString()}, null, 2), "application/json");
    toast("Backup exported. Keep it somewhere safe.");
  }
  function exportCsv() {
    const rows = [["id","date","type","category","amount_lkr","note"], ...data.transactions.map(t => [t.id,t.date,t.kind,t.category,Number(t.amount),t.note || ""])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    downloadFile(`pocket-budget-transactions-${localDate(new Date())}.csv`, "\uFEFF"+csv, "text/csv;charset=utf-8");
    toast("Transactions exported as CSV.");
  }
  function validateBackup(obj) {
    return obj && obj.version === 1 && Array.isArray(obj.transactions) &&
      obj.transactions.every(t => t && typeof t.id === "string" && ["income","expense"].includes(t.kind) && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0 && typeof t.date === "string" && typeof t.category === "string") &&
      (!obj.goals || Array.isArray(obj.goals)) &&
      (!obj.overallBudgets || typeof obj.overallBudgets === "object") &&
      (!obj.categoryBudgets || typeof obj.categoryBudgets === "object");
  }

  $("monthPicker").value = localDate(now).slice(0,7);
  $("todayLabel").textContent = new Date().toLocaleDateString("en-LK", {weekday:"long", day:"numeric", month:"long"}).toUpperCase();
  fillCategorySelect($("transactionCategory"), "expense");
  fillCategorySelect($("categoryBudgetCategory"), "expense", true);
  $("transactionDate").value = localDate(now);
  renderAll();

  $("monthPicker").addEventListener("change", renderAll);
  $("fabAdd").addEventListener("click", () => openTransaction("expense"));
  $("navAddExpense").addEventListener("click", () => openTransaction("expense"));
  $("addTransactionFromList").addEventListener("click", () => openTransaction("expense"));
  $("settingsButton").addEventListener("click", () => openDialog("settingsDialog"));
  $("navSettings").addEventListener("click", () => openDialog("settingsDialog"));
  $("viewAllButton").addEventListener("click", () => $("allTransactions").scrollIntoView({behavior:"smooth",block:"start"}));
  document.querySelectorAll("[data-scroll]").forEach(btn => btn.addEventListener("click", () => {
    if (btn.dataset.scroll === "top") window.scrollTo({top:0,behavior:"smooth"});
    else $(btn.dataset.scroll)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => closeDialog(btn.dataset.close)));
  document.querySelectorAll("[data-kind]").forEach(btn => btn.addEventListener("click", () => {
    selectedKind = btn.dataset.kind;
    document.querySelectorAll("[data-kind]").forEach(b => b.classList.toggle("active", b === btn));
    updateTransactionCategoryOptions();
  }));

  $("transactionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number($("transactionAmount").value);
    const date = $("transactionDate").value;
    if (!Number.isFinite(amount) || amount <= 0 || !date) return toast("Enter a valid amount and date.");
    const editId = $("transactionForm").dataset.editId;
    const old = editId ? data.transactions.find(t => t.id === editId) : null;
    const transaction = {
      id: old?.id || makeId(), kind: selectedKind, amount: Math.round(amount*100)/100,
      category: $("transactionCategory").value, note: $("transactionNote").value.trim(),
      date, createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    if (old) data.transactions = data.transactions.map(t => t.id === editId ? transaction : t);
    else data.transactions.push(transaction);
    if (persist()) { closeDialog("transactionDialog"); renderAll(); toast(old ? "Transaction updated." : "Transaction saved."); }
  });

  $("editBudgetButton").addEventListener("click", () => {
    $("budgetAmount").value = data.overallBudgets[currentMonth()] || "";
    openDialog("budgetDialog");
  });
  $("budgetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number($("budgetAmount").value);
    if (!Number.isFinite(amount) || amount <= 0) return toast("Enter a budget greater than zero.");
    data.overallBudgets[currentMonth()] = Math.round(amount*100)/100;
    if (persist()) { closeDialog("budgetDialog"); renderAll(); toast("Monthly limit saved."); }
  });
  $("addCategoryBudgetButton").addEventListener("click", () => {
    fillCategorySelect($("categoryBudgetCategory"), "expense", true);
    $("categoryBudgetCategory").value = "";
    $("categoryBudgetAmount").value = "";
    openDialog("categoryBudgetDialog");
  });
  $("categoryBudgetForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const category = $("categoryBudgetCategory").value;
    const amount = Number($("categoryBudgetAmount").value);
    if (!category || !Number.isFinite(amount) || amount <= 0) return toast("Choose a category and enter a valid limit.");
    if (!data.categoryBudgets[currentMonth()]) data.categoryBudgets[currentMonth()] = {};
    data.categoryBudgets[currentMonth()][category] = Math.round(amount*100)/100;
    if (persist()) { closeDialog("categoryBudgetDialog"); renderAll(); toast("Category budget saved."); }
  });
  $("categoryBudgets").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-budget-delete]");
    if (!btn) return;
    const category = btn.dataset.budgetDelete;
    if (confirm(`Remove the ${category} budget for ${currentMonth()}?`)) {
      delete data.categoryBudgets[currentMonth()][category];
      if (persist()) { renderAll(); toast("Category budget removed."); }
    }
  });
  $("addGoalButton").addEventListener("click", () => {
    $("goalForm").reset(); $("goalId").value = ""; $("goalSaved").value = "0"; $("goalModalTitle").textContent = "New savings goal"; openDialog("goalDialog");
  });
  $("goalForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("goalId").value;
    const target = Number($("goalTarget").value), saved = Number($("goalSaved").value);
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) return toast("Enter valid goal amounts.");
    const goal = { id: id || makeId(), name: $("goalName").value.trim(), target: Math.round(target*100)/100, saved: Math.round(saved*100)/100 };
    if (!goal.name) return toast("Give your goal a name.");
    if (id) data.goals = data.goals.map(g => g.id === id ? goal : g); else data.goals.push(goal);
    if (persist()) { closeDialog("goalDialog"); renderAll(); toast("Savings goal saved."); }
  });
  $("goalsList").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-goal-edit]");
    const del = event.target.closest("[data-goal-delete]");
    if (edit) {
      const g = data.goals.find(g => g.id === edit.dataset.goalEdit);
      if (!g) return;
      $("goalId").value = g.id; $("goalName").value = g.name; $("goalTarget").value = g.target; $("goalSaved").value = g.saved; $("goalModalTitle").textContent = "Edit savings goal"; openDialog("goalDialog");
    }
    if (del) {
      const g = data.goals.find(g => g.id === del.dataset.goalDelete);
      if (g && confirm(`Delete the "${g.name}" savings goal?`)) {
        data.goals = data.goals.filter(item => item.id !== g.id);
        if (persist()) { renderAll(); toast("Savings goal deleted."); }
      }
    }
  });
  $("allTransactions").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    const del = event.target.closest("[data-delete]");
    if (edit) {
      const t = data.transactions.find(t => t.id === edit.dataset.edit);
      if (t) openTransaction(t.kind, t);
    }
    if (del) {
      const t = data.transactions.find(t => t.id === del.dataset.delete);
      if (t && confirm(`Delete this ${t.kind} of ${money(t.amount)}?`)) {
        data.transactions = data.transactions.filter(item => item.id !== t.id);
        if (persist()) { renderAll(); toast("Transaction deleted."); }
      }
    }
  });
  $("transactionSearch").addEventListener("input", renderAllTransactions);
  $("typeFilter").addEventListener("change", renderAllTransactions);
  $("exportButton").addEventListener("click", exportJson);
  $("exportCsvButton").addEventListener("click", exportCsv);
  $("importInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!validateBackup(parsed)) throw new Error("This file doesn't look like a valid Pocket Budget backup.");
      if (!confirm(`Import ${parsed.transactions.length} transactions and replace the data currently on this device? Export your current data first if you want to keep it.`)) return;
      data = { ...emptyData(), ...parsed, version: 1 };
      if (persist()) { renderAll(); closeDialog("settingsDialog"); toast("Backup imported successfully."); }
    } catch (err) { alert(err.message || "Could not import that file."); }
    finally { event.target.value = ""; }
  });
  $("clearDataButton").addEventListener("click", () => {
    if (!confirm("Permanently clear all Pocket Budget transactions, budgets and goals from this browser? Export a backup first if you may need this data.")) return;
    if (!confirm("This cannot be undone unless you have a backup. Clear everything?")) return;
    data = emptyData();
    if (persist()) { renderAll(); closeDialog("settingsDialog"); toast("Local budget data cleared."); }
  });

  // Progressive Web App: cache shell files for offline opening.
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(err => console.warn("Service worker registration failed:", err));
    });
  }
})();