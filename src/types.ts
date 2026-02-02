export type TodoNode = {
  id: string;
  title: string;
  checked: boolean;
  collapsed: boolean;
  children: TodoNode[];
};
