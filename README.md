# deferred maintenance CLI

Maintenance that is never performed is a risk to our systems.

There are many vectors where "maintenance debt" can accrue in modern systems:

* Non-critical software dependency updates are available.
* Host system patches should be applied.
* Refactoring toward updated coding standards or best practices.
* Cross-cutting changes to infrastructure configuration.
* etc.

Individually, for small systems, completing these tasks are a minor chore.
For large systems and microservices architectures that might span many
hundreds of code repositories, completing these tasks becomes much more
challenging.

Often, efforts to perform maintenance work can seem lower priority, and as
such have a tendency to quickly become "out of sight, out of mind". What is
needed is a way to store the notion of a maintenance task to be deferred in
such a way that it helps us reason transparently about the risk to our
overall systems, and remains quickly actionable by the person who decides to
take action on the work. It has been our experience that storing maintenance
tasks in issue trackers like Jira is better than nothing, but doesn't help us
reason quickly about the overall risk such maintenance debt is contributing.

`deferred-maintenance` is a simple CLI tool for managing this maintenance debt
and risk using the JupiterOne graph.

## Installation and Setup

Install with `npm install -g @jupiterone/deferred-maintenance`.

You will need to either export the following vars, or set them up in a
`~/.env` file:

```
J1_ACCOUNT=<your account name>
J1_API_TOKEN=<your full J1 api token>
J1_EMAIL=<email address associated with your J1 user>
```

Make sure to `chmod 0700 ~/.env`!

## Usage

Running `deferred-maintenance` with no arguments will generate a report of
maintenance that has been opened against your current git repository, if you
happen to be in one that JupiterOne knows about, and also show you any open
maintenance findings you have created previously. Example output:

```
~/repos/jupiterone-client-nodejs master
❯ deferred-maintenance
Gathering maintenance report...
jupiterone-client-nodejs maintenance needed:
maintenanceId                            due         description    link
1fcc361984be5ed11109bd6c3eec01de9f15c7c1 in 6 months Use TypeScript https://jptr.one/tsmaint


erich.smith@jupiterone.com created open maintenance items:
maintenanceId                            due         description         link
64b39a070f08ff3e4e421892354e9f48b246881c in 7 days   Upgrade dev-tools   https://jptr.one/devtools
688f72d87de8eedfc1fdd0fb7123a02bcd1d6636 in 2 months Backend maintenance https://jptr.one/backend
1fcc361984be5ed11109bd6c3eec01de9f15c7c1 in 6 months Use TypeScript      https://jptr.one/tsmaint
OK
```

The `maintenanceId` is a unique id that can help identify these findings in
future queries (see below).

### Opening Deferred Maintenance

Issuing `deferred-maintenance open` will interactively prompt you for a J1QL
query that targets entities in the graph that you want to open maintenance
Findings against. NOTE: for developers, these entities are often CodeRepos,
but maintenance tasks might apply to almost anything in the graph. It is
recommended that you get a J1QL query working in the JupiterOne landing zone
first, to make sure that you target the right entities.

After confirming your entity selection, you'll be prompted for details about
the maintenance that needs to be performed:

* `shortDescription`: a terse description (this will appear in the visual graph
  for each entity!)
* `description`: a more verbose description.
* `webLink`: a link to an issue tracker item or other durable reference that
  "future us" can use to remember the remediation details.
* `dueDate`: a reasonable deferment horizon. Maintenance deferred beyond this
  point should be considered Risk.

![Example session](./assets/open.svg)

### Closing Deferred Maintenance

Issuing `deferred-maintenance close` will interactively prompt you for a J1QL
query that targets `Finding/deferred_maintenance` entities in the graph that
you want to close. It is recommended that you get a J1QL query working in the
JupiterOne landing zone first, to make sure that you target the right
entities.

After confirming your entity selection, you'll be prompted for a web link to
a durable record of actions taken (typically, this is a pull request).

![Example session](./assets/close.svg)

## Example queries

Check if a given CodeRepo has outstanding risk:

`Find deferred_maintenance with closed=false and dueDate < date.now that HAS CodeRepo with name='my-project'`

Find all maintenance risk:

`Find * as e that HAS deferred_maintenance with closed=false and dueDate < date.now as m return e._type, e.displayName, m.*`

Find evidence of maintenance activity for a given entity Class:

`Find deferred_maintenance with closed=true as m that HAS SomeClass as c return c.displayName, m.closedOn, m.closedBy, m.maintenanceLink`

## Further applications of the mechanism

Here are a few ideas that might suggest additional possibilities exposed by
this mechanism:

* Evaluating CodeRepo risk at CI/CD (deploy) time.
* Providing compliance evidence of maintenance activity.
* Alerting Slack when maintenance risk count is too high.
