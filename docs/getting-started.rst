***************
Getting Started
***************

ChangeMachine is designed to work in similar fashion to manufacturing plant, whereby a plant is made up of many machines that perform a single function, and items (or materials) enter the machine, get processed and leave the machine.

In most cases, a machine processes an item successfully:

.. code-block:: javascript

	machine.on('process', function(item) {
		// do something with the item
	
		// mark the item as done
		item.done();
	});

But sometimes things can go wrong:

.. code-block:: javascript

	machine.on('process', function(item) {
		try {
			// do something with the item
		
			// mark the item as done
			item.done();
		}
		catch (e) {
			// mark the item as failed
			item.fail({ error: e });
		}
	});

Additionally, sometimes you might receive an error when something is done but not want to have to call a separate fail function.  You can do this by passing an error in the options for any of the `done`, `fail` or `skip` methods and the status will be remapped to `fail`:

.. code-block:: javascript

	machine.on('process', function(item) {
		// write the item data to a file
		writeItemData(item, function(err) {
			item.done({ error: err });
		});
	});

Regardless of how you flag that an item has failed, you probably want to know about it:

.. code-block:: javascript

	machine.on('fail', function(item, err) {
		console.log('got a failed item: ' + item.id);
	});