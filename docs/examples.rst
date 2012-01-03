**********************
ChangeMachine Examples
**********************

This section of the documentation comments on the examples that are included with the `ChangeMachine source`_.

**NOTE:** As these examples are drawn from the sourcecode, the changemachine is referenced by calling ``require('../')`` and this would need to be replaced with ``require('changemachine')`` in your own code.

Simple Example using Changemate Notifier
========================================

This simple example demonstrates responding to changes from an external couchdb:

.. literalinclude:: ../examples/simple.js
	:language: javascript
	:linenos:

If it is all working nicely, you should see output similar to `simple.output.txt`__.

__ https://github.com/steelmesh/changemachine/blob/master/examples/simple.output.txt

Simple Example demonstrating ready queue
========================================

In the example above, items existed in either the ``waiting`` or ``processing`` queues.  This because the machine had a ``process`` event that could be used to process the items as they enter the machine.  In a case where a ``process`` event handler is not defined, however, the items ready for processing (according to neuron's concurrency setting) will be placed in the ``ready`` queue.

Let's modify the previous example to wire up the process event after 5 seconds:

.. literalinclude:: ../examples/delayedprocess.js
	:language: javascript
	:linenos:

In the `output`__ for this example, you should see that before processing starts a number of items are reported in the ``ready`` queue.  Once the ``process`` event is connected however, the items move directly from a ``waiting`` status to ``processing``.

__ https://github.com/steelmesh/changemachine/blob/master/examples/delayedprocess.output.txt

Checkpointing
=============

At this stage ChangeMachine implements very simple checkpointing storage but it works nicely and event attempts to synchronously persist data when the process `exit` event is detected.

Below is an example that demonstrates how a state store is configured:

.. literalinclude:: ../examples/checkpoint.js
	:language: javascript
	:linenos:

Serializing Data from CouchDB
=============================

If you wanted to extract all the JSON data from documents in a couch database (not the attachments though - although it could be combined with `attachmate`_ to achieve that) the following example is probably of interest:

.. literalinclude:: ../examples/serializedb.js
	:language: javascript
	:linenos:

Non Notifier Change Machines
============================

While ChangeMachine is designed to work in conjuction with `changemate`_, it is possible to create items and process them manually also.

*Example to be completed*

Machine Chaining
================

Machines in ChangeMachine are very chain friendly.  

*Example to be completed*

.. include:: links.txt