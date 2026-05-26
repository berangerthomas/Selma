export const FALLBACK_COLOR = '#6b7280';

export interface PrunedNode extends Omit<TreeNode, 'children'> {
  __cluster_for?: string;
  __cluster_count?: number;
  children?: PrunedNode[];
}

export type ViewMode = 'tree' | 'list' | 'columns';
export type NodeShape = 'circle' | 'rect';
export type Orientation = 'horizontal' | 'vertical';
export type LabelPosition = 'smart' | 'top' | 'bottom' | 'right' | 'left';

export type TagState = 'neutral' | 'include' | 'exclude';
export type TagStates = Record<string, TagState>;

export type Attachment = {
  name: string
  path: string
  format: string
  lang?: string
  size?: number
}

export type TreeNode = {
  id: string
  name: string
  color?: string
  image?: string
  iconChar?: string
  iconFont?: string
  attachments?: Attachment[]
  children?: TreeNode[]
  tags?: string[]
  metadata?: Record<string, string | number | boolean>
}

// Flat DAG node — children are IDs, not nested objects.
export type DagNode = {
  id: string
  name: string
  color?: string
  image?: string
  iconChar?: string
  iconFont?: string
  attachments?: Attachment[]
  tags?: string[]
  metadata?: Record<string, string | number | boolean>
  children?: string[]  // IDs only — not nested objects
}

export type DagData = {
  root: string                   // ID of the root node
  nodes: Record<string, DagNode> // flat map: id → node
}

export type CrossEdge = {
  parentId: string  // secondary parent
  childId: string
}

export type TaxonomyDescription = {
  id: string
  label: string
}
