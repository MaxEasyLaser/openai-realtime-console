import { useEffect, useState } from "react";

const functionDescription = `
Call this function immediately when the user asks to take a snapshot.
Do not ask follow-up questions. This tool has no parameters.
`;

const sessionUpdate = {
	type: "session.update",
	session: {
		instructions: `
You are a measuring assistant. Your only capability is to take snapshots using the connected devices.
When the user asks to take a snapshot, call the take_snapshot tool immediately with NO arguments.
Do not ask what to snapshot or for additional details. If the user asks for anything else, respond exactly with:
"sorry I can only take snapshots, you should ask me to take snapshots instead".
`,
		tools: [
			{
				type: "function",
				name: "take_snapshot",
				description: functionDescription,
				parameters: {
					type: "object",
					strict: true,
					properties: {},
				},
			},
		],
		tool_choice: "auto",
	},
};

function FunctionCallOutput({ functionCallOutput }) {
	const { target, note } = JSON.parse(functionCallOutput.arguments);

	return (
		<div className="flex flex-col gap-2">
			<p className="font-semibold">Snapshot requested</p>
			<p>Target: {target}</p>
			{note ? <p>Note: {note}</p> : null}
			<pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
				{JSON.stringify(functionCallOutput, null, 2)}
			</pre>
		</div>
	);
}

export default function ToolPanel({
	isSessionActive,
	sendClientEvent,
	events,
	onSnapshot,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "take_snapshot"
        ) {
          setFunctionCallOutput(output);
          if (onSnapshot) {
            onSnapshot();
          }
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Snapshot Tool</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Ask the assistant to take a snapshot (e.g., "take a snapshot of the screen").</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
