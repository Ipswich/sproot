---
sidebar_position: 4
title: Automations
---

# Automations

What is an environmental management platform if it can't automatically manage the environment? Sproot leverages its data to automatically trigger events when criteria are met. These criteria can also be combined to create more powerful and precise automations.

Sproot automations are the magic that make the platform more than just a monitoring or switching station. However, before we jump into how to create automations and conditions, it's probably best to start with a high level overview of how the automations and conditions work together.

## High-level model

An automation is evaluated in three different layers:

1. Conditions - Individual checks against data (sensor values, time ranges, output states, etc.)
2. Condition Groups - Logical groupings of conditions (All Of/Any Of/One Of)
3. Automation Evaluation - How the groups are combined to decide if the automation matches

If the automation evaluates to true, its events are triggered. It's effectively a logical expression builder, balancing completeness with readability.

### Conditions

Simply put, a condition is a single statement about the environment that evaluates to true or false.
Examples:

- Temperature is greater than or equal to 75°F
- Soil moisture is below 30%
- Time is between 8:00am and 4:00pm
- Day of the week is Tuesday
  Each condition is evaluated independently and produces either true or false. Simple, but powerful when combined to create more complex expressions.

### Condition Groups

Conditions belong to group which define how the conditions inside are combined.

#### All Of

All conditions in the group must be true. This is equivalent to logical `AND`.

For example, two conditions:

- Temperature greater than 80°F
- Time is between 2:00pm and 4:00pm

The group evaluates to true _only if both conditions are true_.

#### Any Of

One or more condition in the group must be true. This is equivalent to logical `OR`.

For example, two conditions:

- Temperature greater than 80°F
- Relative Humidity greater than 90%

The group evaluates to true _if either condition is true_.

#### One Of

Exactly one condition in the group must be true. This is equalivalent to logical `XOR`.

For example, two conditions:

- Relative Humidity is greater than 90%
- Time is between 8:00am and 4:00pm

The group evaluates to true _only if one - and only one - condition is true_.

### Automation Evaluation

An automation is comprised of each group, but the final step is how those groups are evaluated together. The automation itself has two modes:

#### Match All Groups

Every group must evaluate to true in order for the automation to evaluate as true. This is equivalent to logical `AND` between groups.

#### Match Any Group

One or more group must evaluate to true for the automation to evaluate as true. This is equivalent to logical `OR` between groups

### Events

Ultimately, when an automation evaluates to true, it triggers its events. Typically, this will be something like "Set lights to 60%" or "Turn on water valve 1."

The caveat here is that if there is a collision where two events targeting the same output would trigger with different values, the events remain untriggered. This means that if you set one automation to turn an output on for a given set of conditions, and you have a second automation to turn that same output off for the same set of conditions, the output will remain off. As such, it's generally recommended to either limit an output event to a single automation, or pay extra attention to ensure that your conditions will not allow this to happen.

## Connecting the Pieces (examples)

These are all some mostly contrived examples. They're there to serve as some thought fuel to hopefully be a launching point for how you might creatively leverage the system.

#### Example 1

Say you want to make sure your greenhouse stays warm enough at night. A simple, precise automation might look like this:

- `Match Any Group` or `Match All Groups` (doesn't matter - only one group is populated)
- All Of
  - A Time condition that triggers between 6:00pm and 6:00am
  - A Sensor condition for a thermometer that triggers below 55°F
- Any Of
  - (empty)
- One Of
  - (empty)
- Events
  - Turn Heater On

#### Example 2

In another scenario, imagine a scenario when you need to protect your greenhouse from extreme summer heat. You could model a day time protection automation like this:

- `Match All Groups`
- All Of
  - Time is between 10:00am and 6:00pm
  - Month is May through September
- Any Of
  - Temperature is greater than 80°F
  - Humidity is greater than 85%
- One Of
  - (empty)
- Events
  - Open greenhouse vents
  - Turn on exhaust fans

#### Example 3

Finally, you might want to have a system that ensures that you're only ever powering your irrigation pump to a single zone at a time. You might model this as follows:

- `Match All Groups`
- All Of
  - Time is between 4:00am and 6:00am
- Any Of
  - (empty)
- One Of
  - Zone 1 valve is ON
  - Zone 2 valve is ON
  - Zone 3 valve is ON
- Events
  - Turn on water pump

## Adding a New Automation

<p style={{ textAlign: 'center' }}>
  <img src="/img/Automations.png" alt="Automations" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
  <img src="/img/AutomationsEdit.png" alt="New Automation" style={{ width: '30%', maxWidth: '100%', height: 'auto' }} />
</p>
Navigate to `Automations` from the nav bar. Click the big blue `Add New` button at the bottom, give your new automation a name, and click `Next`.

## Editing an Automation

Once you've got your automation, you'll need to add conditions on which it will trigger, and then actions that it will take when triggered. You can also update the name of your automation here by editing the text and clicking the `Save` icon at the end of the input.

### Automation Evaluation

As explained [above](#automation-evaluation), you must decide whether your automation groups must all be required to evaluate to true, or if any of them can evaluate to true.

### Conditions

You can add or remove conditions by expanding the `Conditions` drop down to reveal your conditions and the `Add Condition` button. To remove a condition, simply click the `Trashcan` icon next to the condition you wish to delete. To add a condition, click the `Add Condition` button. This will reveal two drop downs:

- Condition Type
- Group

The `Condition Type` drop down will give you the options for the variety of condition types that you can choose to define your logic with. These options include:

- Sensor
  - Evaluates to true when a sensor meets a certain threshold. Can also be set to be triggered only if that threshold has been met for a number of minutes.
- Output
  - Evaluates to true when an output meets a certain threshold. Can also be set to be triggered only if that threshold has been met for a number of minutes.
- Weekday
  - Evaluates to true on the provided days of the week.
- Month
  - Evaluates to true during the provided months.
- Date Range
  - Evaluates to true between the start date and end date.
- Time
  - Can evaluate to true between the start time and end time.
  - Can evaluate to true always
  - Can evaluate to true during a provided minute.

The `Group` drop down will let you select which [condition group](#condition-groups) this particular condition will be added to.

### Actions

You can add or remove actions by expanding the `Actions` drop down to reveal your actions and the `Add Action` button. To remove an action, simply click the `Trashcan` icon next to the action you wish to delete. To add an action, click the `Add Action` button. This will reveal the outputs that you can control, and, depending on whether the output is PWM or not, either an on/off toggle or a slider for controlling intensity.
