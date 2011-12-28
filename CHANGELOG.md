# changemachine changelog

## 0.1.6

- calling `done` on an item with an `error` in the options, now maps to a `fail`

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