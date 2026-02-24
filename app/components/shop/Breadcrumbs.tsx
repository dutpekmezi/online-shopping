export function Breadcrumbs({ items }: { items: string[] }) { return <div className="text-sm text-gray-500">{items.join(" / ")}</div>; }
