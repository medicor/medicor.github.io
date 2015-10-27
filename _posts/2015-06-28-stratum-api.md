# API calls to Stratum

Stratum is a platform for quality registers in healthcare. Its api:s can be used for alla kinds of things, for example:


----------
Share of registrations in LVR where the patient has a BMI under 22 , divided by county and gender:

```JSON
/api/aggregate/LVR/Visit/total/share(BodyMassIndex(22))/county(VisitUnit)/Gender
```

<div>
<button class="btn btn-default" onclick="jsondump(this, 'http://stratum.registercentrum.se/api/aggregate/LVR/Visit/total/share(Height(165))/county(VisitUnit)/Gender?apikey=bK3H9bwaG4o=');">Run this!</button></div>

----------

Number of registrations in LVR where the patient has a BMI under 22 , divided by county and gender:

```JSON
/api/aggregate/LVR/Visit/total/count(BodyMassIndex(22))/county(VisitUnit)/Gender
```

<div>
<button class="btn btn-default" onclick="jsondump(this, 'http://stratum.registercentrum.se/api/aggregate/LVR/Visit/total/count(Height(165))/county(VisitUnit)/Gender?apikey=bK3H9bwaG4o=');">Run this!</button></div>

----------
Skrivet med [<i class="icon-provider-stackedit"></i> StackEdit](https://stackedit.io/).
