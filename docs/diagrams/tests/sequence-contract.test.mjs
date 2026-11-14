import assert from "node:assert/strict";
import test from "node:test";
import { validateSequenceContract } from "../sequence-contract.mjs";

const header = "@startuml\nactor User\nboundary View\ncontrol Service\ncontrol Worker\nentity Data\n";

test("nested calls return before the caller continues; events do not require replies", () => {
  const source = header + `User ->> View : click
View -> Service : load()
alt allowed
Service -> Data ++ : read
Data --> Service -- : snapshot
Service ->> Worker : background task
else denied
note right of Service
set access error
end note
end
Service --> View : result or error
View ->> User : display
Worker -> Data ++ : write
Data --> Worker -- : saved
@enduml`;
  assert.deepEqual(validateSequenceContract(source), { calls: 3, replies: 3, events: 3 });
});

test("rejects missing return instead of silently drawing a continuing caller", () => {
  assert.throws(() => validateSequenceContract(header + "View -> Service : load()\nView -> Data : next"), /still owes a return/);
});

test("rejects return to the wrong caller and orphan return", () => {
  assert.throws(() => validateSequenceContract(header + "View -> Service : load()\nService --> User : result"), /does not match/);
  assert.throws(() => validateSequenceContract(header + "Service --> View : result"), /does not match/);
});

test("rejects call left open at a branch boundary or the end of source", () => {
  assert.throws(() => validateSequenceContract(header + "alt valid\nView -> Service : load()\nelse invalid\nend"), /branch leaves/);
  assert.throws(() => validateSequenceContract(header + "View -> Service : load()"), /unclosed/);
});

test("rejects closing the wrong activation and a return marker on an event", () => {
  assert.throws(() => validateSequenceContract(header + "View -> Service ++ : load()\nService --> View : result"), /close exactly/);
  assert.throws(() => validateSequenceContract(header + "View ->> Worker -- : execute()"), /asynchronous event/);
});

test("full activation policy covers nested calls, returns and UI events", () => {
  const source = header + `' ActivationPolicy: full
activate User
activate View
User ->> View : click
View -> Service ++ : load()
Service -> Service ++ : prepare()
Service --> Service -- : prepared
Service -> Data ++ : read
Data --> Service -- : snapshot
Service --> View -- : result
View ->> User : display
deactivate View
deactivate User
@enduml`;
  assert.deepEqual(validateSequenceContract(source), { calls: 3, replies: 3, events: 2 });
});

test("full activation policy rejects a missing receiver bar on a call or event", () => {
  const prefix = header + "' ActivationPolicy: full\nactivate View\n";
  assert.throws(() => validateSequenceContract(prefix + "View -> Service : load()"), /no call receiver activation/);
  assert.throws(() => validateSequenceContract(prefix + "View ->> Worker : task"), /no event receiver activation/);
});

test("full activation policy rejects a return whose caller bar ended too early", () => {
  const source = header + "' ActivationPolicy: full\nactivate View\nView -> Service ++ : load()\ndeactivate View\nService --> View -- : result";
  assert.throws(() => validateSequenceContract(source), /no activation at the return endpoint/);
});

test("an asynchronous receiver may start a root execution and continue without a synchronous reply", () => {
  const source = header + `' ActivationPolicy: full
activate User
User ->> View ++ : click
View -> Service ++ : load()
Service --> View -- : result
View ->> User : display
deactivate View
deactivate User
@enduml`;
  assert.deepEqual(validateSequenceContract(source), { calls: 1, replies: 1, events: 2 });
});
