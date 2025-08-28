import { useEffect, useState } from "react";

const takeSnapshotDescription = `
Call this function immediately when the user asks to take a snapshot.
Do not ask follow-up questions. This tool has no parameters.
`;

const navigateNextDescription = `
Move the UI to the next step in the workflow when the user asks to go to the next page or step.
`;

const navigatePrevDescription = `
Move the UI to the previous step in the workflow when the user asks to go back.
`;

const sessionUpdate = {
	type: "session.update",
	session: {
		instructions: `
You are a measuring assistant for a multi-step workflow (Define → Set up → Measure → Result).
Capabilities:
- Navigate steps when asked (next/previous).
- Take a snapshot ONLY on the Measure page.
Rules:
- When asked to take a snapshot, call take_snapshot with NO args.
- When asked to go to the next step/page, call go_next_step.
- When asked to go back/previous step/page, call go_previous_step.
- If user asks for anything else, politely say you can navigate steps or take snapshots only.
`,
		tools: [
			{
				type: "function",
				name: "take_snapshot",
				description: takeSnapshotDescription,
				parameters: {
					type: "object",
					strict: true,
					properties: {},
				},
			},
			{
				type: "function",
				name: "go_next_step",
				description: navigateNextDescription,
				parameters: { type: "object", strict: true, properties: {} },
			},
			{
				type: "function",
				name: "go_previous_step",
				description: navigatePrevDescription,
				parameters: { type: "object", strict: true, properties: {} },
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
	onNextStep,
	onPrevStep,
	isOnMeasurePage,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [lastInfoMessage, setLastInfoMessage] = useState("");

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
            if (isOnMeasurePage) {
              onSnapshot();
              setLastInfoMessage("");
            } else {
              setLastInfoMessage("Snapshots are only available on the Measure page.");
            }
          }
        }
        if (output.type === "function_call" && output.name === "go_next_step") {
          if (onNextStep) onNextStep();
        }
        if (output.type === "function_call" && output.name === "go_previous_step") {
          if (onPrevStep) onPrevStep();
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
        <h2 className="text-lg font-bold">AI Assistant</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p>Try commands like:</p>
              <ul className="list-disc ml-5">
                <li>"go to next step"</li>
                <li>"go back a step"</li>
                <li>"take a snapshot" (Measure page only)</li>
              </ul>
              {lastInfoMessage ? (
                <p className="text-orange-600">{lastInfoMessage}</p>
              ) : null}
            </div>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>
    </section>
  );
}
