declare module "lucide-react" {
  import * as React from "react"

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >

  export const AlertTriangle: LucideIcon
  export const Users: LucideIcon
  export const TrendingDown: LucideIcon
  export const ArrowRight: LucideIcon
}


