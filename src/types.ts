export type ViewMode = 'organic' | 'compact' | 'list' | 'columns'

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
}
