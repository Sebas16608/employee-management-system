const API_URL = "http://localhost:8000/api/employees/";
const DEPARTMENT_URL = "http://localhost:8000/api/departments";

async function loadDepartments() {
  const response = await fetch(DEPARTMENT_URL)
  const departments = await response.json();

  const select = document.getElementById("department");

  departments.forEach((department) => {
    const option = document.createElement('option');

    option.value = department.id;
    option.textContent = department.name;

    select.appendChild(option);
  })
}

async function loadEmployees() {
  const response = await fetch(API_URL);
  const employees = await response.json();

  const table = document.getElementById("employees-table");

  table.innerHTML = "";

  employees.forEach((employee) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${employee.code}</td>
      <td>${employee.name}</td>
      <td>${employee.last_name}</td>
      <td>${employee.birthdate ?? ""}</td>
      <td>${employee.department.name}</td>
      <td>
      <button onclick="editEmployee(${employee.id})">
          Editar
      </button>
      <button onclick="deleteEmployee(${employee.id})">
        Eliminar
      </button>
        </td>
      `;
    table.appendChild(row)
  })
}

const form = document.getElementById("employee-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const employee = {
    name: document.getElementById("name").value,
    last_name: document.getElementById("last_name").value,
    birthdate: document.getElementById("birthdate").value,
    department_id: document.getElementById("department").value,
  };

  const url = editingEmployeeId
    ? `${API_URL}${editingEmployeeId}/`
    : API_URL;

  const method = editingEmployeeId ? "PATCH" : "POST";

  const response = await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(employee)
  });

  if (response.ok) {
    form.reset();
    editingEmployeeId = null;
    await loadEmployees();
    return;
  }

  const error = await response.json();

  console.error(error);
})

let editingEmployeeId = null;

async function editEmployee(id) {
  const response = await fetch(`${API_URL}${id}/`);
  const employee = await response.json();

  document.getElementById("name").value = employee.name;
  document.getElementById("last_name").value = employee.last_name;
  document.getElementById("birthdate").value = employee.birthdate ?? "";
  document.getElementById("department").value = employee.department.id;

  editingEmployeeId = id;
}


async function deleteEmployee(id) {
  const response = await fetch(`${API_URL}${id}/`, {
    method: "DELETE",
  });

  if (response.ok) {
    await loadEmployees();
  }
}

loadDepartments();
loadEmployees();
