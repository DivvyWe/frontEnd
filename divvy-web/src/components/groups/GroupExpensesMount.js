// components/groups/GroupExpensesMount.jsx
"use client";

import GroupExpenses from "@/components/groups/GroupExpenses.jsx";

export default function GroupExpensesMount(props) {
  // just pass through; keeps the client boundary clean
  return <GroupExpenses {...props} />;
}
