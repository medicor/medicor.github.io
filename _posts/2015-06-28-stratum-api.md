# API calls to Stratum

Stratum is a platform for healthcare quality registers. Its aggregate api can be used for all kinds of descriptive statistics, for example:

----------
Share of registrations in the Swedish Respiratory Register where patients have a BMI under 22 , split by county and gender:

```JSON
/api/aggregate/LVR/Visit/total/share(BodyMassIndex(22))/county(VisitUnit)/Gender
```
<div>
<button class="btn btn-default" onclick="jsondump(this, 'http://stratum.registercentrum.se/api/aggregate/LVR/Visit/total/share(Height(165))/county(VisitUnit)/Gender?apikey=bK3H9bwaG4o=');">Run this!</button></div>

----------
Number of registrations in the Swedish Fracture Register, split by place of and activity during injury:

```JSON
/api/aggregate/SFR/Skade/total/count/Inj_Place/Inj_Activity
```
<div>
<button class="btn btn-default" onclick="jsondump(this, 'http://stratum.registercentrum.se/api/aggregate/SFR/Skade/total/count/Inj_Place/Inj_Activity?apikey=bK3H9bwaG4o=');">Run this!</button></div>

----------
Written with [<i class="icon-provider-stackedit"></i> StackEdit](https://stackedit.io/) markdown editor.
