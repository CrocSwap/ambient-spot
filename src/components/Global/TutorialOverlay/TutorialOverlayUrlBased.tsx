import {
    Dispatch,
    memo,
    SetStateAction,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    DISABLE_ALL_TUTOS,
    SHOW_TUTOS_DEFAULT,
} from '../../../ambient-utils/constants';
import { useLinkGen } from '../../../utils/hooks/useLinkGen';
import { TutorialIF, TutorialStepIF } from '../../Chat/ChatIFs';
import { generateObjectHash, getLS, setLS } from '../../Chat/ChatUtils';
import TutorialComponent from '../TutorialComponent/TutorialComponent';
// import { ambientMarketSteps } from '../../../utils/tutorial/MarketSteps';

const SHOW_TUTOS_LOCAL_STORAGE_KEY = 'showTutosLocalStorage';

interface TutorialOverlayPropsIF {
    replayTutorial: boolean;
    setReplayTutorial: Dispatch<SetStateAction<boolean>>;
    tutorialBtnRef: React.RefObject<HTMLDivElement | null>;
    checkStepHash?: boolean;
}
function TutorialOverlayUrlBased(props: TutorialOverlayPropsIF) {
    const { checkStepHash, replayTutorial, setReplayTutorial, tutorialBtnRef } =
        props;

    const { currentPage } = useLinkGen();
    const [selectedTutorial, setSelectedTutorial] = useState<
        TutorialIF | undefined
    >();
    const selectedTutorialRef = useRef<TutorialIF | undefined>(undefined);
    selectedTutorialRef.current = selectedTutorial;
    const [isTutoBuild, setIsTutoBuild] = useState<boolean>(false);
    const [stepsFiltered, setStepsFiltered] = useState<TutorialStepIF[]>([]);

    const [showTutorial, setShowTutorial] = useState<boolean>(false);
    const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

    const [showTutosLocalStorage] = useState<boolean>(() => {
        const lsValue = localStorage.getItem(SHOW_TUTOS_LOCAL_STORAGE_KEY);
        return lsValue === null
            ? SHOW_TUTOS_DEFAULT === 'true'
            : lsValue === 'true';
    });

    const getTutorialObjectForPage = (_page: string): TutorialIF | undefined =>
        undefined;

    const validateURL = () => {
        return (
            getTutorialObjectForPage(currentPage) &&
            getTutorialObjectForPage(currentPage)?.lsKey ==
                selectedTutorialRef.current?.lsKey
        );
    };

    const assignSelectedTuto = () => {
        if (currentPage && getTutorialObjectForPage(currentPage)) {
            setSelectedTutorial(getTutorialObjectForPage(currentPage));
        } else {
            setSelectedTutorial(undefined);
        }
    };

    const handleShowState = async (filteredSteps: TutorialStepIF[]) => {
        if (
            selectedTutorialRef.current &&
            selectedTutorialRef.current.lsKey ==
                getTutorialObjectForPage(currentPage)?.lsKey
        ) {
            const lsVal = getLS(selectedTutorialRef.current.lsKey);

            if (checkStepHash) {
                const currentStepsHash =
                    await generateObjectHash(filteredSteps);
                return lsVal != currentStepsHash;
            } else {
                return !lsVal;
            }
        } else {
            return false;
        }
    };

    const handleTutoFinish = async () => {
        let lsValue = '';
        if (selectedTutorialRef.current) {
            if (checkStepHash) {
                lsValue = await generateObjectHash(
                    selectedTutorialRef.current?.steps,
                );
            } else {
                lsValue = new Date().toISOString();
            }
            if (stepsFiltered.length > 0 && selectedTutorialRef.current) {
                setLS(selectedTutorialRef.current.lsKey, lsValue);
            }
        }

        setShowTutorial(false);
        setReplayTutorial(false);
    };

    const filterRenderedSteps = () => {
        const filteredSteps: TutorialStepIF[] = [];

        if (selectedTutorialRef.current && selectedTutorialRef.current.steps) {
            const steps = selectedTutorialRef.current.steps;

            if (steps instanceof Array) {
                steps.map((e) => {
                    const el = document.querySelectorAll(e.element as string);
                    if (el.length > 0) {
                        filteredSteps.push(e);
                    }
                });
            }
        }
        return filteredSteps;
    };

    const handleTutoBuild = async () => {
        const filteredSteps = filterRenderedSteps();
        if (filteredSteps.length > 0) {
            const showTutos = await handleShowState(filteredSteps);
            setShowTutorial(showTutos);
            setStepsFiltered(filteredSteps);
        }
        setIsTutoBuild(true);
    };

    useEffect(() => {
        setTimeout(() => {
            assignSelectedTuto();
        }, 1000);
    }, []);

    useEffect(() => {
        assignSelectedTuto();
        setIsTutoBuild(false);
    }, [currentPage]);

    useEffect(() => {
        handleTutoBuild();
        setReplayTutorial(false);
        if (selectedTutorial?.helpModal) {
            setShowHelpModal(true);
        } else {
            setShowHelpModal(false);
        }
    }, [selectedTutorial]);

    useEffect(() => {
        if (replayTutorial) {
            setShowHelpModal(
                selectedTutorialRef.current?.helpModal ? true : false,
            );
        }
    }, [replayTutorial]);

    const shouldTutoComponentShown =
        validateURL() &&
        stepsFiltered.length > 0 &&
        showTutorial &&
        isTutoBuild &&
        selectedTutorialRef.current?.showDefault &&
        showTutosLocalStorage &&
        !DISABLE_ALL_TUTOS;

    if (!shouldTutoComponentShown && filterRenderedSteps().length > 0) {
        if (tutorialBtnRef.current?.style) {
            tutorialBtnRef.current.style.display = 'flex';
        }
    } else {
        if (tutorialBtnRef.current?.style) {
            tutorialBtnRef.current.style.display = 'none';
        }
    }

    return (
        <>
            {(shouldTutoComponentShown || replayTutorial) &&
                selectedTutorialRef.current && (
                    <>
                        {showHelpModal ? (
                            selectedTutorialRef.current.helpModal?.content
                        ) : (
                            <TutorialComponent
                                key={selectedTutorialRef.current.lsKey}
                                tutoKey={selectedTutorialRef.current.lsKey}
                                steps={filterRenderedSteps()}
                                showSteps={true}
                                onComplete={handleTutoFinish}
                                initialTimeout={600}
                                externalComponents={
                                    selectedTutorialRef.current
                                        .externalComponents
                                }
                            />
                        )}
                    </>
                )}
        </>
    );
}

export default memo(TutorialOverlayUrlBased);
