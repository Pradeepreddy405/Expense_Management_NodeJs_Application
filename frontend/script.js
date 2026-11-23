
const API_URL = '/api/expenses';

const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const message = document.getElementById('message');

// Display messages
function showMessage(text, color) {
    message.textContent = text;
    message.style.color = color;
}

// Retrieve all expenses
async function getExpenses() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to retrieve expenses');
        }

        expenseTableBody.innerHTML = '';

        result.data.forEach(expense => {
            const row = document.createElement('tr');

            const values = [
                expense.id,
                expense.title,
                `₹${Number(expense.amount).toFixed(2)}`,
                expense.category,
                expense.expense_date
                    ? new Date(expense.expense_date).toLocaleDateString('en-IN')
                    : '-',
                expense.description || '-'
            ];

            values.forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.appendChild(cell);
            });

            expenseTableBody.appendChild(row);
        });

    } catch (error) {
        showMessage(error.message, 'red');
    }
}

// Add a new expense
expenseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const expense = {
        title: document.getElementById('title').value.trim(),
        amount: Number(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        expense_date: document.getElementById('expense_date').value,
        description: document.getElementById('description').value.trim()
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expense)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to add expense');
        }

        showMessage('Expense added successfully!', 'green');

        expenseForm.reset();

        await getExpenses();

    } catch (error) {
        showMessage(error.message, 'red');
    }
});

// Load expenses when page opens
getExpenses();

