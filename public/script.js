document.addEventListener("DOMContentLoaded", () => {
  const noteForm = document.getElementById("noteForm");
  const noteTitle = document.getElementById("noteTitle");
  const noteText = document.getElementById("noteText");
  const noteList = document.getElementById("noteList");

  async function loadNotes() {
    const response = await fetch("/");
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    const newList = doc.getElementById("noteList");
    noteList.innerHTML = newList.innerHTML;
    attachEventListeners();
  }

  noteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const response = await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: noteTitle.value, text: noteText.value }),
    });

    const result = await response.json();
    if (result.success) {
      noteTitle.value = "";
      noteText.value = "";
      loadNotes();
    } else alert(result.error);
  });

  function attachEventListeners() {
    document.querySelectorAll(".delete-btn").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const id = e.target.parentElement.getAttribute("data-id");
        await fetch(`/delete/${id}`, { method: "DELETE" });
        loadNotes();
      })
    );
  }

  loadNotes();
});
