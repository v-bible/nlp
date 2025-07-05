import model from 'wink-eng-lite-web-model';
import winkNLP from 'wink-nlp';

const initWinkNLP = () => {
  const nlp = winkNLP(model);
  return nlp;
};

const winkNLPInstance = initWinkNLP();

export { winkNLPInstance };
