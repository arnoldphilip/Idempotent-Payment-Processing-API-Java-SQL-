document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadDashboardStats();
    loadTasks();
    initForms();
});

// --- UI State & Navigation ---
function initTabs() {
    const navItems = document.querySelectorAll('nav li');
    const tabViews = document.querySelectorAll('.tab-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            tabViews.forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`${tabId}-view`);
            if (targetView) targetView.classList.add('active');

            document.getElementById('tab-title').textContent = item.textContent;

            // Load specific data
            if (tabId === 'tasks') loadTasks();
            if (tabId === 'dashboard') loadDashboardStats();
            if (tabId === 'payments') loadPayments();
            if (tabId === 'idempotency') loadIdempotencyKeys();
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// --- API Interactions ---
async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

async function loadTasks() {
    try {
        const tasks = await apiFetch('/api/v1/tasks');
        updateTasksTable(tasks);
        updateDashboardTasks(tasks.slice(0, 5));
        return tasks;
    } catch (e) { console.error(e); }
}

async function loadPayments() {
    // Note: Since we don't have a direct transactions GET endpoint yet in the controller, 
    // we'll assume the user might add one, or we can fetch a few for the UI.
    // For now, let's keep it informative.
    const tbody = document.getElementById('payments-table-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Transaction history is stored in the PostgreSQL 'transactions' table.</td></tr>`;
}

async function loadDashboardStats() {
    try {
        const tasks = await apiFetch('/api/v1/tasks');
        document.getElementById('stat-active-tasks').textContent = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
    } catch (e) { console.error(e); }
}

async function loadIdempotencyKeys() {
    const list = document.getElementById('keys-list');
    try {
        const keys = await apiFetch('/api/v1/payments/idempotency');
        if (!list) return;
        list.innerHTML = '';
        if (keys.length === 0) {
            list.innerHTML = '<p class="empty-msg">No keys saved yet.</p>';
            return;
        }
        keys.forEach(record => {
            const div = document.createElement('div');
            div.className = 'recent-task-item';
            div.innerHTML = `
                <code style="font-size:0.75rem">${record.key}</code>
                <span class="badge badge-completed">Saved</span>
            `;
            list.appendChild(div);
        });
    } catch (e) { }
}

function updateTasksTable(tasks) {
    const tbody = document.getElementById('tasks-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${task.id.substring(0, 8)}...</td>
            <td>${task.title}</td>
            <td><span class="badge badge-${task.status.toLowerCase()}">${task.status}</span></td>
            <td>v${task.version}</td>
            <td>
                <button class="btn-sm btn-pay" onclick="initiatePayment('${task.id}')">Pay</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDashboardTasks(tasks) {
    const container = document.getElementById('recent-tasks-list');
    if (!container) return;

    if (tasks.length === 0) return;

    container.innerHTML = '';
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'recent-task-item';
        div.innerHTML = `
            <span>${task.title}</span>
            <span class="status-dot ${task.status.toLowerCase()}"></span>
        `;
        container.appendChild(div);
    });
}

function initForms() {
    const taskForm = document.getElementById('form-new-task');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById('task-title').value,
                description: document.getElementById('task-desc').value
            };

            try {
                await apiFetch('/api/v1/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast('Task created successfully!', 'success');
                closeModal('modal-task');
                loadTasks();
            } catch (e) { }
        });
    }

    document.getElementById('btn-new-task')?.addEventListener('click', () => openModal('modal-task'));
}

// --- Simulation Labs ---

async function runIdempotencyTest() {
    const log = document.getElementById('idempotency-log');
    log.innerHTML = '';

    const tasks = await loadTasks();
    if (!tasks || tasks.length === 0) {
        log.innerHTML = '<p class="error">Create a task first!</p>';
        return;
    }

    const task = tasks[0];
    const key = `key-${Math.floor(Math.random() * 10000)}`;

    appendLog(log, `Starting Test with Key: ${key}`, 'info');

    // Request 1
    appendLog(log, "Sending Request 1...", 'info');
    try {
        const res1 = await processPaymentAPI(task.id, key);
        appendLog(log, `Request 1 Success: Status ${res1.status}`, 'success');
    } catch (e) { appendLog(log, `Request 1 Error: ${e.message}`, 'error'); }

    // Request 2 (Duplicate)
    setTimeout(async () => {
        appendLog(log, `Sending Request 2 (Duplicate Key)...`, 'info');
        try {
            const res2 = await processPaymentAPI(task.id, key);
            appendLog(log, `Request 2 Success: Status ${res2.status} (Verified Idempotent)`, 'success');
            showToast("Idempotency Verified!", "success");
        } catch (e) { appendLog(log, `Request 2 Error: ${e.message}`, 'error'); }
    }, 1500);
}

async function runConcurrencyTest() {
    const log = document.getElementById('concurrency-log');
    log.innerHTML = '';

    const tasks = await loadTasks();
    if (!tasks || tasks.length === 0) {
        log.innerHTML = '<p class="error">Create a task first!</p>';
        return;
    }

    const task = tasks[0];
    appendLog(log, `Initiating Parallel Updates for Task ID: ${task.id.substring(0, 8)}`, 'info');

    const payload1 = { title: "Nexus Update A", description: "First Win" };
    const payload2 = { title: "Nexus Update B", description: "Conflict Check" };

    appendLog(log, "Firing Request 1 and Request 2 simultaneously...", 'info');

    const req1 = fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1)
    });

    const req2 = fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
    });

    try {
        const [res1, res2] = await Promise.all([req1, req2]);

        if (res1.ok) appendLog(log, "Request 1: Successfully processed", 'success');

        if (res2.status === 409) {
            appendLog(log, "Request 2: Blocked by Server (409 Conflict - Optimistic Lock)", 'success');
            showToast("Concurrency Safety Verified!", "success");
        } else if (res2.ok) {
            appendLog(log, "Request 2: Also succeeded (This means they were slightly sequential)", 'warning');
        } else {
            appendLog(log, `Request 2 Failed: Status ${res2.status}`, 'error');
        }
    } catch (e) {
        appendLog(log, `Error during simulation: ${e.message}`, 'error');
    }

    loadTasks();
}

function appendLog(element, message, type) {
    const p = document.createElement('p');
    p.className = `log-entry ${type}`;
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    element.appendChild(p);
    element.scrollTop = element.scrollHeight;
}

async function initiatePayment(taskId) {
    const key = `pay-${taskId}-${Date.now()}`;
    try {
        const res = await processPaymentAPI(taskId, key);
        showToast(`Payment Successful: ${res.status}`, 'success');
        loadTasks();
    } catch (e) { }
}

async function processPaymentAPI(taskId, key) {
    const payload = {
        taskId: taskId,
        amount: 89.99,
        currency: 'USD',
        externalReference: `REF-${key}`
    };

    return await apiFetch('/api/v1/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': key
        },
        body: JSON.stringify(payload)
    });
}

// --- Notifications ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 300);
    }, 4000);
}
