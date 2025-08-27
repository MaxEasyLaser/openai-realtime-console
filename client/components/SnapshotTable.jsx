import React from "react";

export default function SnapshotTable({ rows }) {
	return (
		<div className="w-full h-full bg-gray-50 rounded-md p-4 overflow-auto">
			<h2 className="text-lg font-bold mb-4">Measure axis</h2>
			<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-gray-300 text-gray-900">
						<th className="p-3 w-16">#</th>
						<th className="p-3">Pos<br/><span className="text-xs text-gray-700">(mm)</span></th>
						<th className="p-3">V<br/><span className="text-xs text-gray-700">(µm)</span></th>
						<th className="p-3">H<br/><span className="text-xs text-gray-700">(µm)</span></th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, idx) => {
						const isActive = idx === rows.length - 1;
						return (
							<tr key={row.id} className={isActive ? "bg-orange-400" : "bg-gray-700 text-white"}>
								<td className="p-3">{row.id}</td>
								<td className="p-3">{row.pos}</td>
								<td className="p-3">{row.v ?? "---"}</td>
								<td className="p-3">{row.h ?? "---"}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}


