import firebase from 'firebase';
import config from '../../util/config';

firebase.initializeApp(config.firebase);

export default firebase.database();