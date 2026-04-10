# Introduction

This is a guide documentation for TutorialComponent.

# TutorialIF

This is the interface for tutorial object.

| prop                  | definition                                                                                              | type                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `lsKey`               | Local storage key for tutorial                                                                          | string                                      |
| `steps`               | Steps array for tutorial                                                                                | TutorialStepIF[]                            |
| `showDefault?`        | Indicates if tutorial should be shown by default                                                        | boolean                                     |
| `helpModal?`          | Help modal object for tutorial                                                                          | { title: string, content: React.ReactNode } |
| `externalComponents?` | External components for tutorial, can be used if you want to add custom component into tutorial tooltip | Map<string, TutorialStepExternalComponent>  |

# TutorialStepIF

This is the interface for tutorial steps. (which derived from intro.js Step interface to maintain compatibility)

| prop                | definition                                                                                                                 | type                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `element`           | Dom selector element which will highlighted related step                                                                   | string `{#element_id, .className etc..}` |
| `title`             | Title string for tooltip                                                                                                   | string                                   |
| `intro`             | Intro string for tooltip                                                                                                   | string                                   |
| `actionTrigger?`    | Action trigger for tooltip, this should be a dom selector element which will trigger action when related step is activated | string `{#element_id, .className etc..}` |
| `navigate?`         | Navigate object for tooltip, which will place a button on tooltip to navigate to related page                              | { label: string, path: string }          |
| `actionOnComplete?` | Action to be triggered on complete, same approach with actionTrigger prop                                                  | string `{#element_id, .className etc..}` |

## Tutorial Step Files

Step files are located in; <br>
`src/utils/tutorial` folder. <br>

## Assigning a tutorial for a page

The page-step relationship is established in the component named `<TutorialOverlayUrlBased>`

Inside that component `getTutorialObjectForPage()` method, switch case block is used to associate step file with page name.
