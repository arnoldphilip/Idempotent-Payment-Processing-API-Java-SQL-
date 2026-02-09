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

            // Update Sidebar
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update View
            tabViews.forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`${tabId}-view`);
            if (targetView) targetView.classList.add('active');

            // Update Header
            document.getElementById('tab-title').textContent = item.textContent;

            // Load specific data
            if (tabId === 'tasks') loadTasks();
            if (tabId === 'dashboard') loadDashboardStats();
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
    } catch (e) { console.error(e); }
}

async function loadDashboardStats() {
    try {
        const tasks = await apiFetch('/api/v1/tasks');
        document.getElementById('stat-active-tasks').textContent = tasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
        // Payments stat would need a transactions endpoint, let's keep it static for now or fetch if available
    } catch (e) { console.error(e); }
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
                <button class="btn-sm btn-edit" onclick="testConcurrency('${task.id}')">Simulate Conflict</button>
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

// --- Laboratory Functions (Testing Idempotency & Concurrency) ---
async function initiatePayment(taskId) {
    const key = `pay-${taskId}-${Date.now()}`;
    processPayment(taskId, key, 'initial');
}

async function processPayment(taskId, key, type = 'initial') {
    const payload = {
        taskId: taskId,
        amount: 50.00,
        currency: 'USD',
        externalReference: `EXT-${key}`
    };

    try {
        const result = await apiFetch('/api/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Idempotency-Key': key
            },
            body: JSON.stringify(payload)
        });
        showToast(`Payment ${type === 'retry' ? '(Cached)' : 'Success'}: ${result.status}`, 'success');
        loadTasks();
    } catch (e) { }
}

async function testConcurrency(taskId) {
    showToast('Simulating concurrent updates...', 'warning');

    const payload1 = { title: "Update Winner", description: "First one wins" };
    const payload2 = { title: "Update Loser", description: "Second one should fail" };

    // Send two requests almost simultaneously
    const req1 = fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1)
    });

    const req2 = fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
    });

    try {
        const [res1, res2] = await Promise.all([req1, req2]);
        if (res1.ok) showToast('Request 1: Success', 'success');
        if (res2.status === 409) showToast('Request 2: Blocked by Concurrency Rule (409)', 'success');
        else if (!res2.ok) showToast('Request 2 Failed as expected', 'error');

        loadTasks();
    } catch (e) {
        showToast('Concurrency Test Error', 'error');
    }
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
        setTimeout(() => container.removeChild(toast), 300);
    }, 4000);
}
