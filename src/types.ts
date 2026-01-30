export type TodoNode = {
  id: string;
  title: string;
  checked: boolean; // stored for leaf nodes; for parents this is ignored (derived from children)
  collapsed: boolean;
  children: TodoNode[];
  createdAt: number;
};
