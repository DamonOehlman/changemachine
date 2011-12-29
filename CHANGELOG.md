# changemachine changelog

## 0.3

- Added machine registry and repl
- Reworked `fail` event to pass through error

## 0.2.2

- Rework "at capacity" detection logic
- Refine machine.close logic to clean up neuron job queue
- Only allow one machine with one id active at a time
- Ensure that if a notifier is created for the machine, then it is paused if the machine is in a paused state.

## 0.2.1

- Add the `leaveOn` member for a machine, by default leaveOn.fail is false

## 0.2.0

- Bump version to reflect addition of new methods in 0.1.x versions

## 0.1.7

- Added `pause` and `resume` methods and events to the machine for flow control help

## 0.1.6

- calling `done` on an item with an `error` in the options, now maps to a `fail`
- added a `close` method to a machine which closes the underlying changemate notifier
- changed JsonStore to use `fs.writeFileSync` as in particular cases callback was never firing for `fs.writeFile`

## 0.1.5

- Revisions to checkpointing logic (enable fails to checkpoint)
- Added `checkpointOn` object to machine for toggling checkpoint on `done`, `fail`, etc

## 0.1.4

- Made item methods chainable
- State now referenced as checkpoint (it's more accurate)

## 0.1.3

- Added basic state storage (`JsonStore`)

## 0.1.2

- Added error message for `item.fail` call
- Parameter passthrough for item `done` and `fail` events

## 0.1.1

- Reworked items and queuing to make manual item / machine interaction simpler.
- Added status queues in the machine for watching item state
- Reworked `newListener` implementation to be more efficient.

## 0.1.0 

- Initial version