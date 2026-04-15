export type TreeNode = {
  id: string
  name: string
  description?: string
  color?: string
  image?: string
  iconChar?: string
  iconFont?: string
  children?: TreeNode[]
}
