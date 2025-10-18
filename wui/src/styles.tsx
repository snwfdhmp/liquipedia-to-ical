import { FaSpinner } from "react-icons/fa6"
import clsx from "clsx"

interface StylableComponentProps {
  className?: string
  style?: React.CSSProperties
}

export const Spinner = ({ className, style }: StylableComponentProps) => {
  return (
    <FaSpinner
      className={clsx("animate-spin", className)}
      style={{ ...style }}
    />
  )
}
