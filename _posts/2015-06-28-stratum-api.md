# API calls to Stratum

Stratum is a platform for quality registers in healthcare. Its api:s can be used for alla kinds of things, for example:


----------
Number of registrations in the Swedish Respiratory Register where patients have a BMI under 22 , divided by county and gender:
```JSON
/api/aggregate/LVR/Visit/total/count(BodyMassIndex(22))/county(VisitUnit)/Gender
```
<div>
<button class="btn btn-default" onclick="jsondump(this, 'http://stratum.registercentrum.se/api/aggregate/LVR/Visit/total/count(Height(165))/county(VisitUnit)/Gender?apikey=bK3H9bwaG4o=');">Run this!</button></div>

----------
Same thing as above but share of registrations instead of count:
```JSON
/api/aggregate/LVR/Visit/total/share(BodyMassIndex(22))/county(VisitUnit)/Gender
```
<div>
<button class="btn btn-default" onclick="jsondump(this, 'http://stratum.registercentrum.se/api/aggregate/LVR/Visit/total/share(Height(165))/county(VisitUnit)/Gender?apikey=bK3H9bwaG4o=');">Run this!</button></div>

----------
Written with [<i class="icon-provider-stackedit"></i> StackEdit](https://stackedit.io/) markdown editor.
