// Fiktive testkunder. Rekkefølgen her bestemmer rekkefølgen i runden.
const customers = [
  { id: "demo-1", name: "Eksempelkunde A" },
  { id: "demo-2", name: "Eksempelkunde B" },
  { id: "demo-3", name: "Eksempelkunde C" },
];

const customerList = document.querySelector("#customer-list");

for (const customer of customers) {
  const listItem = document.createElement("li");
  listItem.textContent = customer.name;
  customerList.append(listItem);
}
