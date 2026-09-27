const API_URL = "http://localhost:8000/api/departments/";

async function loadDepartments() {
  const response = await fetch(API_URL);
  const departments = await response.json();

  const table = document.getElementById("departments-table");

  table.innerHTML = "";

  departments.forEach((department) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${department.code}</td>
      <td>${department.name}</td>
      <td>${department.description ?? ""}</td>
      <td>
        <button onclick="editDepartment(${department.id})">
          Editar
        </button>

        <button onclick="deleteDepartment(${department.id})">
          Eliminar
        </button>
      </td>
    `;

    table.appendChild(row);
  });
}

const form = document.getElementById("department-form");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const department = {
    code: document.getElementById("code").value,
    name: document.getElementById("name").value,
    description: document.getElementById("description").value,
  };

  const url = editingDepartmentId
    ? `${API_URL}${editingDepartmentId}/`
    : API_URL;

  const method = editingDepartmentId ? "PATCH" : "POST";

  const response = await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(department)
  });

  if (response.ok) {
    form.reset();
    editingDepartmentId = null;
    await loadDepartments();
    return;
  }

  const error = await response.json();

  console.error(error);
});

let editingDepartmentId = null;

async function editDepartment(id) {
  const response = await fetch(`${API_URL}${id}/`);
  const department = await response.json();

  document.getElementById("code").value = department.code;
  document.getElementById("name").value = department.name;
  document.getElementById("description").value = department.description ?? "";

  editingDepartmentId = id;
}

async function deleteDepartment(id) {
  const response = await fetch(`${API_URL}${id}/`, {
    method: "DELETE"
  });

  if (response.ok) {
    await loadDepartments();
  }
}

loadDepartments();
